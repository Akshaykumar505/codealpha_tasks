import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <div className="auth-side-mark">Flowdesk / Project Ledger</div>
        <div>
          <h1>Every task has a home. Every update finds its people.</h1>
          <p>
            Boards, assignments and comments for teams who'd rather ship than chase
            status updates in five different chats.
          </p>
        </div>
        <div className="auth-ledger">
          <div>001 — <span>Create a project board</span></div>
          <div>002 — <span>Assign work to teammates</span></div>
          <div>003 — <span>Discuss inside each task, live</span></div>
        </div>
      </aside>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-eyebrow">Welcome back</div>
          <h2>Log in to Flowdesk</h2>
          <p className="auth-form-sub">Pick up your boards right where you left them.</p>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@team.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="auth-switch">
            New to Flowdesk? <Link to="/register">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
