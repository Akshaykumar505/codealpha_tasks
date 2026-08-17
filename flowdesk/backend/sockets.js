// Small singleton wrapper so route handlers can emit socket events
// without circular-importing the main server file.
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io has not been initialized yet");
  }
  return ioInstance;
}

// Emits to everyone currently viewing a project board.
function emitToProject(projectId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`project:${projectId}`).emit(event, payload);
}

// Emits to a single user's personal room (used for notifications).
function emitToUser(userId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIO, getIO, emitToProject, emitToUser };
