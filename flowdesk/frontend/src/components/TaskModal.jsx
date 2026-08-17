import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Avatar from "./Avatar";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso + "Z").getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TaskModal({ task, project, onClose, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || "");
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : "");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const typingTimeout = useRef(null);
  const commentListRef = useRef(null);

  useEffect(() => {
    api.getTask(task.id).then(({ comments }) => setComments(comments)).catch(() => {});
  }, [task.id]);

  useEffect(() => {
    if (!socket) return;
    const onComment = ({ comment, taskId }) => {
      if (taskId !== task.id) return;
      setComments((prev) => [...prev, comment]);
    };
    const onCommentDeleted = ({ commentId, taskId }) => {
      if (taskId !== task.id) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };
    const onTaskUpdated = ({ task: updated }) => {
      if (updated.id !== task.id) return;
      onUpdated(updated);
    };
    const onTyping = ({ taskId, userName }) => {
      if (taskId !== task.id || userName === user.name) return;
      setTypingUser(userName);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setTypingUser(""), 2500);
    };

    socket.on("comment:added", onComment);
    socket.on("comment:deleted", onCommentDeleted);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:typing", onTyping);
    return () => {
      socket.off("comment:added", onComment);
      socket.off("comment:deleted", onCommentDeleted);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:typing", onTyping);
    };
  }, [socket, task.id, user.name, onUpdated]);

  useEffect(() => {
    commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight });
  }, [comments.length]);

  const saveField = async (patch) => {
    setSaving(true);
    setError("");
    try {
      const { task: updated } = await api.updateTask(task.id, {
        title, description, priority, dueDate: dueDate || null, ...patch,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssigneeChange = async (e) => {
    const value = e.target.value;
    setAssigneeId(value);
    try {
      const { task: updated } = await api.assignTask(task.id, value || null);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (e) => {
    try {
      const { task: updated } = await api.moveTask(task.id, { status: e.target.value, position: 0 });
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task? This can't be undone.")) return;
    try {
      await api.deleteTask(task.id);
      onDeleted(task.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.addComment(task.id, newComment.trim());
      setNewComment("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTyping = (val) => {
    setNewComment(val);
    socket?.emit("task:typing", { projectId: project.id, taskId: task.id, userName: user.name });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <div className="task-detail-eyebrow">TASK-{task.id.slice(0, 6)} · {project.name}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <input
          className="task-detail-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => saveField({})}
        />

        <textarea
          className="task-detail-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => saveField({})}
          placeholder="Add a description…"
        />

        <div className="task-detail-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Status</label>
            <select value={task.status} onChange={handleStatusChange}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Priority</label>
            <select value={priority} onChange={(e) => { setPriority(e.target.value); saveField({ priority: e.target.value }); }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Assignee</label>
            <select value={assigneeId} onChange={handleAssigneeChange}>
              <option value="">Unassigned</option>
              {project.members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); }} onBlur={() => saveField({})} />
          </div>
        </div>

        <div className="task-detail-section-title">
          <span>Comments · {comments.length}</span>
        </div>
        <div className="comment-list" ref={commentListRef}>
          {comments.map((c) => (
            <div className="comment-item" key={c.id}>
              <Avatar user={c.author} size={30} />
              <div className="comment-bubble">
                <div className="comment-head">
                  <span className="comment-author">{c.author.name}</span>
                  <span className="comment-time">{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-content">{c.content}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>No comments yet. Start the discussion below.</p>
          )}
        </div>
        {typingUser && <div className="typing-hint">{typingUser} is typing…</div>}

        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <textarea
            value={newComment}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Write a comment…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit(e);
              }
            }}
          />
          <button className="btn btn-primary" type="submit">Send</button>
        </form>

        <div className="task-detail-footer">
          <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>{saving ? "Saving…" : "\u00A0"}</span>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} type="button">Delete task</button>
        </div>
      </div>
    </div>
  );
}
