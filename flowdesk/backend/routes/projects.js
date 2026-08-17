const express = require("express");
const db = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const {
  uuid,
  publicUser,
  isProjectMember,
  createNotification,
} = require("../utils/helpers");
const { emitToUser, emitToProject } = require("../sockets");

const router = express.Router();
router.use(requireAuth);

function getMembers(projectId) {
  const rows = db
    .prepare(
      `SELECT u.*, pm.role FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY pm.joined_at ASC`
    )
    .all(projectId);
  return rows.map((r) => ({ ...publicUser(r), role: r.role }));
}

// List every project the current user belongs to.
router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.* FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(req.user.id);

  const projects = rows.map((p) => {
    const taskCounts = db
      .prepare(
        `SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status`
      )
      .all(p.id);
    const memberCount = db
      .prepare(`SELECT COUNT(*) as c FROM project_members WHERE project_id = ?`)
      .get(p.id).c;
    return { ...p, taskCounts, memberCount };
  });

  res.json({ projects });
});

// Create a new project. Creator becomes owner + first member.
router.post("/", (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO projects (id, name, description, owner_id) VALUES (?, ?, ?, ?)`
  ).run(id, name.trim(), description || "", req.user.id);

  db.prepare(
    `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')`
  ).run(id, req.user.id);

  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
  res.status(201).json({ project: { ...project, members: getMembers(id) } });
});

// Fetch one project with members + tasks.
router.get("/:id", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!isProjectMember(project.id, req.user.id)) {
    return res.status(403).json({ error: "You are not a member of this project" });
  }

  const tasks = db
    .prepare(`SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at ASC`)
    .all(project.id);

  const tasksWithPeople = tasks.map((t) => ({
    ...t,
    assignee: t.assignee_id
      ? publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(t.assignee_id))
      : null,
    commentCount: db
      .prepare(`SELECT COUNT(*) as c FROM comments WHERE task_id = ?`)
      .get(t.id).c,
  }));

  res.json({
    project: { ...project, members: getMembers(project.id), tasks: tasksWithPeople },
  });
});

// Update project name/description (owner only).
router.put("/:id", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Only the project owner can edit this project" });
  }

  const { name, description } = req.body;
  db.prepare(`UPDATE projects SET name = ?, description = ? WHERE id = ?`).run(
    name?.trim() || project.name,
    description ?? project.description,
    project.id
  );

  const updated = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(project.id);
  emitToProject(project.id, "project:updated", { project: updated });
  res.json({ project: { ...updated, members: getMembers(project.id) } });
});

// Delete a project (owner only).
router.delete("/:id", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (project.owner_id !== req.user.id) {
    return res.status(403).json({ error: "Only the project owner can delete this project" });
  }
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(project.id);
  emitToProject(project.id, "project:deleted", { projectId: project.id });
  res.json({ ok: true });
});

// Add a member to the project by email.
router.post("/:id/members", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!isProjectMember(project.id, req.user.id)) {
    return res.status(403).json({ error: "You are not a member of this project" });
  }

  const { email } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get((email || "").toLowerCase());
  if (!user) return res.status(404).json({ error: "No user found with that email" });

  if (isProjectMember(project.id, user.id)) {
    return res.status(409).json({ error: "That person is already a member" });
  }

  db.prepare(
    `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')`
  ).run(project.id, user.id);

  const notification = createNotification({
    userId: user.id,
    type: "project_invite",
    message: `${req.user.name} added you to "${project.name}"`,
    projectId: project.id,
  });
  emitToUser(user.id, "notification:new", { notification });
  emitToProject(project.id, "project:member_added", { member: { ...publicUser(user), role: "member" } });

  res.status(201).json({ members: getMembers(project.id) });
});

// Remove a member (owner only, or a member removing themselves).
router.delete("/:id/members/:userId", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const isSelf = req.params.userId === req.user.id;
  if (project.owner_id !== req.user.id && !isSelf) {
    return res.status(403).json({ error: "Only the owner can remove other members" });
  }
  if (project.owner_id === req.params.userId) {
    return res.status(400).json({ error: "The project owner cannot be removed" });
  }

  db.prepare(`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`).run(
    project.id,
    req.params.userId
  );
  emitToProject(project.id, "project:member_removed", { userId: req.params.userId });
  res.json({ members: getMembers(project.id) });
});

module.exports = router;
