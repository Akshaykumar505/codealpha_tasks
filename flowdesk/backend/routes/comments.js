const express = require("express");
const db = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { uuid, publicUser, isProjectMember, createNotification } = require("../utils/helpers");
const { emitToUser, emitToProject } = require("../sockets");

const router = express.Router();
router.use(requireAuth);

// Add a comment to a task. Notifies the assignee + task creator (if not the commenter).
router.post("/tasks/:taskId/comments", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!isProjectMember(task.project_id, req.user.id)) {
    return res.status(403).json({ error: "You are not a member of this project" });
  }

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO comments (id, task_id, user_id, content) VALUES (?, ?, ?, ?)`
  ).run(id, task.id, req.user.id, content.trim());

  const row = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id);
  const comment = { ...row, author: publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id)) };

  emitToProject(task.project_id, "comment:added", { comment, taskId: task.id });

  const notifyTargets = new Set(
    [task.assignee_id, task.created_by].filter((id) => id && id !== req.user.id)
  );
  notifyTargets.forEach((userId) => {
    const notification = createNotification({
      userId,
      type: "comment",
      message: `${req.user.name} commented on "${task.title}"`,
      projectId: task.project_id,
      taskId: task.id,
    });
    emitToUser(userId, "notification:new", { notification });
  });

  res.status(201).json({ comment });
});

router.get("/tasks/:taskId/comments", (req, res) => {
  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(req.params.taskId);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!isProjectMember(task.project_id, req.user.id)) {
    return res.status(403).json({ error: "You are not a member of this project" });
  }

  const comments = db
    .prepare(`SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC`)
    .all(task.id)
    .map((c) => ({
      ...c,
      author: publicUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(c.user_id)),
    }));

  res.json({ comments });
});

router.delete("/comments/:id", (req, res) => {
  const comment = db.prepare(`SELECT * FROM comments WHERE id = ?`).get(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own comments" });
  }

  const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(comment.task_id);
  db.prepare(`DELETE FROM comments WHERE id = ?`).run(comment.id);
  emitToProject(task.project_id, "comment:deleted", { commentId: comment.id, taskId: task.id });
  res.json({ ok: true });
});

module.exports = router;
