import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-mark">FD</span>
        Flowdesk
      </Link>
      <div className="navbar-right">
        <span className="live-pill">
          <span className={`live-dot ${connected ? "on" : ""}`} />
          {connected ? "Live" : "Offline"}
        </span>
        <NotificationBell />
        <div className="navbar-user">
          <Avatar user={user} size={32} />
          <span className="navbar-username">{user?.name}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
