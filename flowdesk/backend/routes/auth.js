const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db/db");
const { requireAuth } = require("../middleware/auth");
const { uuid, randomAvatarColor, publicUser } = require("../utils/helpers");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarColor = randomAvatarColor();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)`
  ).run(id, name.trim(), email.toLowerCase(), passwordHash, avatarColor);

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  const token = signToken(user);

  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

// Lightweight user search so people can be added to a project by email/name.
router.get("/search", requireAuth, (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM users WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ?) AND id != ? LIMIT 10`
    )
    .all(q, q, req.user.id);
  res.json({ users: rows.map(publicUser) });
});

module.exports = router;
