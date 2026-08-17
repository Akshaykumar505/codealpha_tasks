require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const { setIO } = require("./sockets");
const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const commentRoutes = require("./routes/comments");
const notificationRoutes = require("./routes/notifications");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "flowdesk-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", taskRoutes);
app.use("/api", commentRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 + error handling
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});

// Authenticate every socket connection with the same JWT used for the REST API.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Missing authentication token"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  // Personal room, used to push notifications directly to this user.
  socket.join(`user:${socket.user.id}`);

  socket.on("project:join", (projectId) => {
    if (projectId) socket.join(`project:${projectId}`);
  });

  socket.on("project:leave", (projectId) => {
    if (projectId) socket.leave(`project:${projectId}`);
  });

  socket.on("task:typing", ({ projectId, taskId, userName }) => {
    socket.to(`project:${projectId}`).emit("task:typing", { taskId, userName });
  });
});

setIO(io);

server.listen(PORT, () => {
  console.log(`Flowdesk backend running on http://localhost:${PORT}`);
});
