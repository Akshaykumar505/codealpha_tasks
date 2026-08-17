import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

export default function MembersPanel({ project, onClose, onMembersChanged }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOwner = project.owner_id === user.id;

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { members } = await api.addMember(project.id, email.trim());
      onMembersChanged(members);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId) => {
    try {
      const { members } = await api.removeMember(project.id, memberId);
      onMembersChanged(members);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Project members</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email"
            required
            style={{ flex: 1, border: "1px solid var(--line-strong)", borderRadius: 8, padding: "0.55rem 0.7rem" }}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Invite"}
          </button>
        </form>

        <div className="member-list">
          {project.members.map((m) => (
            <div className="member-row" key={m.id}>
              <div className="member-row-left">
                <Avatar user={m} size={34} />
                <div>
                  <div className="member-name">{m.name}{m.id === user.id ? " (you)" : ""}</div>
                  <div className="member-email">{m.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="member-role">{m.role}</span>
                {isOwner && m.role !== "owner" && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(m.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
