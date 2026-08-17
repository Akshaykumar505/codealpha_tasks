const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("flowdesk_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),
  searchUsers: (q) => request(`/auth/search?q=${encodeURIComponent(q)}`),

  listProjects: () => request("/projects"),
  createProject: (payload) => request("/projects", { method: "POST", body: payload }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, payload) => request(`/projects/${id}`, { method: "PUT", body: payload }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  addMember: (id, email) => request(`/projects/${id}/members`, { method: "POST", body: { email } }),
  removeMember: (id, userId) => request(`/projects/${id}/members/${userId}`, { method: "DELETE" }),

  createTask: (projectId, payload) =>
    request(`/projects/${projectId}/tasks`, { method: "POST", body: payload }),
  getTask: (id) => request(`/tasks/${id}`),
  updateTask: (id, payload) => request(`/tasks/${id}`, { method: "PUT", body: payload }),
  moveTask: (id, payload) => request(`/tasks/${id}/move`, { method: "PUT", body: payload }),
  assignTask: (id, assigneeId) =>
    request(`/tasks/${id}/assign`, { method: "PUT", body: { assigneeId } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  listComments: (taskId) => request(`/tasks/${taskId}/comments`),
  addComment: (taskId, content) =>
    request(`/tasks/${taskId}/comments`, { method: "POST", body: { content } }),
  deleteComment: (id) => request(`/comments/${id}`, { method: "DELETE" }),

  listNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PUT" }),
};

export { getToken, API_BASE };
