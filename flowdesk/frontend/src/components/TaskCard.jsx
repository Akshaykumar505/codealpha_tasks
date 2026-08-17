import Avatar from "./Avatar";

function isOverdue(dueDate, status) {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatDue(dueDate) {
  return new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TaskCard({ task, index, onOpen, onDragStart, onDragEnd, dragging }) {
  const shortId = task.id.slice(0, 6);
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      className={`task-card priority-${task.priority} ${dragging ? "dragging" : ""}`}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(task)}
    >
      <div className="task-card-id">TASK-{shortId}</div>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-foot">
        <div className="task-card-meta">
          {task.due_date && (
            <span className={`task-card-due ${overdue ? "overdue" : ""}`}>{formatDue(task.due_date)}</span>
          )}
          {task.commentCount > 0 && (
            <span className="task-card-comments">💬 {task.commentCount}</span>
          )}
        </div>
        <Avatar user={task.assignee} size={26} />
      </div>
    </div>
  );
}
