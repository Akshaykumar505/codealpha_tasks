const express = require("express");
const db = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { uuid, publicUser, isProjectMember, createNotification } = require("../utils/helpers");
const { emitToUser, emitToProject } = require("../sockets");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["todo", "in_progress", "done", "blocked"];

function serializeTask(t) {
  return {
    ...t,
    assignee: t.assignee_id
      ? publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(t.assignee_id))
      : null,
    commentCount: db.prepare(`SELECT COUNT(*) as c FROM comments WHERE task_id = ?`).get(t.id).c,
  };
}

function requireMembership(req, res, projectId) {
  if (!isProjectMember(projectId, req.user.id)) {
    res.status(403).json({ error: "You are not a member of this project" });
    return false;
  }
  return true;
}

// Create a task inside a project.
router.post("/projects/:projectId/tasks", (req, res) => {
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!requireMembership(req, res, project.id)) return;

  const { title, description, assigneeId, dueDate, priority } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required" });
  }
  if (assigneeId && !isProjectMember(project.id, assigneeId)) {
    return res.status(400).json({ error: "Assignee must be a member of this project" });
  }

  const maxPos = db
    .prepare(`SELECT COALESCE(MAX(position), -1) as m FROM tasks WHERE project_id = ? AND status = 'todo'`)
    .get(project.id).m;

  const id = uuid();
  db.prepare(
    `INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, created_by, due_date, position)
     VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)`
  ).run(
    id,
    project.id,
    title.trim(),
    description || "",
    priority && ["low", "medium", "high"].includes(priority) ? priority : "medium",
    assigneeId || null,
    req.user.id,
    dueDate || null,
    maxPos + 1
  );

  const task = serializeTask(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id));
  emitToProject(project.id, "task:created", { task });

  if (assigneeId && assigneeId !== req.user.id) {
    const notification = createNotification({
      userId: assigneeId,
      type: "task_assigned",
      message: `${req.user.name} assigned you to "${task.title}"`,
      projectId: project.id,
      taskId: task.id,
    });
    emitToUser(assigneeId, "notification:new", { notification });
  }

  res.status(201).json({ task });
});

// Update a task's fields (title, description, priority, due date).
router.put("/tasks/:id", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!requireMembership(req, res, task.project_id)) return;

  const { title, description, priority, dueDate } = req.body;
  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    title?.trim() || task.title,
    description ?? task.description,
    priority && ["low", "medium", "high"].includes(priority) ? priority : task.priority,
    dueDate ?? task.due_date,
    task.id
  );

  const updated = serializeTask(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id));
  emitToProject(task.project_id, "task:updated", { task: updated });
  res.json({ task: updated });
});

// Move a task between status columns (drag-and-drop) and reorder.
router.put("/tasks/:id/move", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!requireMembership(req, res, task.project_id)) return;

  const { status, position } = req.body;
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
  }

  db.prepare(
    `UPDATE tasks SET status = ?, position = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(status, Number.isFinite(position) ? position : task.position, task.id);

  const updated = serializeTask(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id));
  emitToProject(task.project_id, "task:moved", { task: updated });
  res.json({ task: updated });
});

// Assign / reassign a task.
router.put("/tasks/:id/assign", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!requireMembership(req, res, task.project_id)) return;

  const { assigneeId } = req.body;
  if (assigneeId && !isProjectMember(task.project_id, assigneeId)) {
    return res.status(400).json({ error: "Assignee must be a member of this project" });
  }

  db.prepare(`UPDATE tasks SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
    assigneeId || null,
    task.id
  );

  const updated = serializeTask(db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id));
  emitToProject(task.project_id, "task:updated", { task: updated });

  if (assigneeId && assigneeId !== req.user.id) {
    const notification = createNotification({
      userId: assigneeId,
      type: "task_assigned",
      message: `${req.user.name} assigned you to "${updated.title}"`,
      projectId: task.project_id,
      taskId: task.id,
    });
    emitToUser(assigneeId, "notification:new", { notification });
  }

  res.json({ task: updated });
});

// Delete a task.
router.delete("/tasks/:id", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!requireMembership(req, res, task.project_id)) return;

  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(task.id);
  emitToProject(task.project_id, "task:deleted", { taskId: task.id, projectId: task.project_id });
  res.json({ ok: true });
});

// Fetch a single task with its comments.
router.get("/tasks/:id", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!requireMembership(req, res, task.project_id)) return;

  const comments = db
    .prepare(`SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC`)
    .all(task.id)
    .map((c) => ({
      ...c,
      author: publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(c.user_id)),
    }));

  res.json({ task: serializeTask(task), comments });
});

module.exports = router;
