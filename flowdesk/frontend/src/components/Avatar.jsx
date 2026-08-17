export default function Avatar({ user, size = 32 }) {
  if (!user) {
    return (
      <span
        className="avatar"
        style={{ width: size, height: size, background: "var(--line-strong)", fontSize: size * 0.4 }}
        title="Unassigned"
      >
        ?
      </span>
    );
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: user.avatarColor, fontSize: size * 0.4 }}
      title={user.name}
    >
      {initials}
    </span>
  );
}
