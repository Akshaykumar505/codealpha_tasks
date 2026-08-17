import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Navbar from "../components/Navbar";
import Avatar from "../components/Avatar";
import NewProjectModal from "../components/NewProjectModal";
import "../styles/dashboard.css";

const STATUS_LABELS = { todo: "To do", in_progress: "In progress", done: "Done", blocked: "Blocked" };

export default function Dashboard() {
  const [projects, setProjects] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api
      .listProjects()
      .then(({ projects }) => setProjects(projects))
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreated = (project) => {
    setShowNew(false);
    setProjects((prev) => [{ ...project, taskCounts: [], memberCount: 1 }, ...(prev || [])]);
  };

  const totalTasks = (p) => p.taskCounts.reduce((sum, t) => sum + t.count, 0);
  const doneTasks = (p) => p.taskCounts.find((t) => t.status === "done")?.count || 0;

  return (
    <div>
      <Navbar />
      <div className="page-shell">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">Your workspace</div>
            <h1>Projects</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New project
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {projects === null && <p style={{ color: "var(--ink-soft)" }}>Loading your projects…</p>}

        {projects && projects.length === 0 && (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Create your first board to start assigning tasks and tracking work with your team.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>
              + New project
            </button>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="project-grid">
            {projects.map((p) => (
              <Link to={`/projects/${p.id}`} className="project-card" key={p.id}>
                <h3>{p.name}</h3>
                <p className="project-card-desc">{p.description || "No description yet."}</p>
                <div className="project-card-foot">
                  <div className="project-stats">
                    <span>{doneTasks(p)}/{totalTasks(p)} done</span>
                    <span>·</span>
                    <span>{p.memberCount} {p.memberCount === 1 ? "member" : "members"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
    </div>
  );
}
