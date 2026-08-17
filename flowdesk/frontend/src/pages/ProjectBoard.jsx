import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import Navbar from "../components/Navbar";
import Avatar from "../components/Avatar";
import TaskCard from "../components/TaskCard";
import TaskModal from "../components/TaskModal";
import NewTaskModal from "../components/NewTaskModal";
import MembersPanel from "../components/MembersPanel";
import "../styles/board.css";

const COLUMNS = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "blocked", label: "Blocked" },
];

export default function ProjectBoard() {
  const { id } = useParams();
  const { socket } = useSocket();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const load = () => {
    api
      .getProject(id)
      .then(({ project }) => {
        const { tasks, ...rest } = project;
        setProject(rest);
        setTasks(tasks);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("project:join", id);

    const upsertTask = (task) => {
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        return exists ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task];
      });
    };
    const onCreated = ({ task }) => upsertTask(task);
    const onUpdated = ({ task }) => upsertTask(task);
    const onMoved = ({ task }) => upsertTask(task);
    const onDeleted = ({ taskId }) => setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const onMemberAdded = ({ member }) =>
      setProject((prev) => (prev ? { ...prev, members: [...prev.members, member] } : prev));
    const onMemberRemoved = ({ userId }) =>
      setProject((prev) => (prev ? { ...prev, members: prev.members.filter((m) => m.id !== userId) } : prev));
    const onCommentAdded = ({ taskId }) =>
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, commentCount: t.commentCount + 1 } : t)));

    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:moved", onMoved);
    socket.on("task:deleted", onDeleted);
    socket.on("project:member_added", onMemberAdded);
    socket.on("project:member_removed", onMemberRemoved);
    socket.on("comment:added", onCommentAdded);

    return () => {
      socket.emit("project:leave", id);
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:moved", onMoved);
      socket.off("task:deleted", onDeleted);
      socket.off("project:member_added", onMemberAdded);
      socket.off("project:member_removed", onMemberRemoved);
      socket.off("comment:added", onCommentAdded);
    };
  }, [socket, id]);

  const columns = useMemo(() => {
    const map = { todo: [], in_progress: [], done: [], blocked: [] };
    tasks
      .slice()
      .sort((a, b) => a.position - b.position)
      .forEach((t) => map[t.status]?.push(t));
    return map;
  }, [tasks]);

  const handleTaskCreated = (task) => {
    setShowNewTask(false);
    setTasks((prev) => [...prev, task]);
  };

  const handleTaskUpdated = (task) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    setActiveTask((prev) => (prev && prev.id === task.id ? task : prev));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setActiveTask(null);
  };

  const handleDragStart = (e, task) => {
    setDragTaskId(task.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragOverCol(null);
  };

  const handleDrop = async (status) => {
    setDragOverCol(null);
    if (!dragTaskId) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task || task.status === status) {
      setDragTaskId(null);
      return;
    }
    const newPosition = columns[status].length;
    setTasks((prev) => prev.map((t) => (t.id === dragTaskId ? { ...t, status, position: newPosition } : t)));
    setDragTaskId(null);
    try {
      await api.moveTask(task.id, { status, position: newPosition });
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  if (error && !project) {
    return (
      <div>
        <Navbar />
        <div className="board-shell">
          <div className="error-banner">{error}</div>
          <Link to="/" className="board-back">← Back to projects</Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <Navbar />
        <div className="board-shell">
          <p style={{ color: "var(--ink-soft)" }}>Loading board…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="board-shell">
        <div className="board-head">
          <div className="board-head-left">
            <Link to="/" className="board-back">← All projects</Link>
            <h1>{project.name}</h1>
            {project.description && <p className="board-desc">{project.description}</p>}
          </div>
          <div className="board-actions">
            <div className="board-members" onClick={() => setShowMembers(true)}>
              {project.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} user={m} size={32} />
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => setShowMembers(true)}>Members</button>
            <button className="btn btn-primary" onClick={() => setShowNewTask(true)}>+ New task</button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="board-columns">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`board-column ${dragOverCol === col.key ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="board-column-head">
                <div className="board-column-title">
                  <span className={`col-dot col-dot-${col.key}`} />
                  {col.label}
                </div>
                <span className="board-column-count">{columns[col.key].length}</span>
              </div>

              {columns[col.key].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpen={setActiveTask}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  dragging={dragTaskId === task.id}
                />
              ))}

              <button className="column-add-btn" onClick={() => setShowNewTask(true)}>+ Add a task</button>
            </div>
          ))}
        </div>
      </div>

      {showNewTask && (
        <NewTaskModal project={project} onClose={() => setShowNewTask(false)} onCreated={handleTaskCreated} />
      )}
      {activeTask && (
        <TaskModal
          task={activeTask}
          project={project}
          onClose={() => setActiveTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}
      {showMembers && (
        <MembersPanel
          project={project}
          onClose={() => setShowMembers(false)}
          onMembersChanged={(members) => setProject((prev) => ({ ...prev, members }))}
        />
      )}
    </div>
  );
}
