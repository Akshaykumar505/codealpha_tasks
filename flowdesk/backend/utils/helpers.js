const { v4: uuid } = require("uuid");
const db = require("../db/db");

const AVATAR_COLORS = [
  "#2F5D50", "#C77D3B", "#B3432B", "#3B5B7C",
  "#6B4E71", "#7A8450", "#A8763E", "#4C6E81",
];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarColor: row.avatar_color,
  };
}

function isProjectMember(projectId, userId) {
  const row = db
    .prepare(
      `SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?`
    )
    .get(projectId, userId);
  return !!row;
}

function createNotification({ userId, type, message, projectId = null, taskId = null }) {
  const id = uuid();
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, message, project_id, task_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, type, message, projectId, taskId);
  return db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(id);
}

module.exports = {
  uuid,
  randomAvatarColor,
  publicUser,
  isProjectMember,
  createNotification,
};
