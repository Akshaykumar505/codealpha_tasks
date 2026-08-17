# Flowdesk — Collaborative Project & Task Board

A full-stack Trello/Asana-style project management tool: auth, project boards,
task cards, comments, and live real-time updates over WebSockets.

## What's included

- **Backend** — Node.js + Express + SQLite (`better-sqlite3`) + JWT auth + Socket.io
- **Frontend** — React (Vite) + React Router + Socket.io client, no external UI kit
- **Auth** — email/password signup & login, JWT-based sessions
- **Projects** — create boards, invite teammates by email, remove members
- **Tasks** — kanban board with 4 columns (To do / In progress / Done / Blocked),
  drag-and-drop, priority, due dates, assignment
- **Comments** — per-task discussion thread
- **Real-time** — Socket.io pushes task moves, new comments, assignments, and
  notifications to every connected teammate instantly, plus a live "typing…" indicator
- **Notifications** — in-app bell with unread badge, updated live via WebSockets

## Project structure

```
flowdesk/
├── backend/            Express API + Socket.io server
│   ├── db/             SQLite schema & connection (db.js)
│   ├── middleware/      JWT auth middleware
│   ├── routes/          auth, projects, tasks, comments, notifications
│   ├── utils/            shared helpers
│   ├── sockets.js        Socket.io singleton + emit helpers
│   └── server.js         app entry point
└── frontend/            React (Vite) client
    └── src/
        ├── api/          fetch-based API client
        ├── context/       Auth + Socket React contexts
        ├── components/    Navbar, TaskCard, TaskModal, modals, etc.
        ├── pages/         Login, Register, Dashboard, ProjectBoard
        └── styles/        CSS (design tokens in index.css)
```

## Prerequisites

- Node.js 18+ and npm

## 1. Run the backend

```bash
cd backend
cp .env.example .env      # edit JWT_SECRET if you like
npm install
npm run dev                # starts on http://localhost:4000
```

The SQLite database file (`backend/db/flowdesk.sqlite`) is created automatically
on first run — no separate database server needed.

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env       # points at http://localhost:4000/api by default
npm install
npm run dev                 # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

## 3. Try it out

1. Register two accounts (e.g. in two browser windows/tabs, or one normal + one
   incognito window) so you can see real-time sync between two "teammates."
2. Create a project with account A.
3. Open **Members** and invite account B by email.
4. Create a task, assign it to B — B sees a notification appear instantly.
5. Drag the task between columns, add a comment — both windows update live,
   no refresh needed.

## How the WebSocket layer works

- The client connects to Socket.io with the same JWT used for REST calls
  (`socket.io-client`, `auth: { token }`).
- On opening a project board, the client emits `project:join` to join a
  per-project room (`project:<id>`).
- Every mutating REST endpoint (create/move/delete task, add comment, add/remove
  member) emits the resulting change to that room, so every open board updates
  without polling.
- Each user also has a personal room (`user:<id>`) used only for their
  notifications bell.
- A lightweight `task:typing` event powers the "X is typing…" indicator inside
  a task's comment box.

## API overview

| Method | Route                              | Purpose                        |
|--------|-------------------------------------|---------------------------------|
| POST   | `/api/auth/register`                | Create account                  |
| POST   | `/api/auth/login`                   | Log in                          |
| GET    | `/api/auth/me`                      | Current user                    |
| GET    | `/api/projects`                     | List my projects                |
| POST   | `/api/projects`                     | Create project                  |
| GET    | `/api/projects/:id`                 | Project + members + tasks       |
| POST   | `/api/projects/:id/members`         | Invite member by email          |
| DELETE | `/api/projects/:id/members/:userId` | Remove member                   |
| POST   | `/api/projects/:id/tasks`           | Create task                     |
| PUT    | `/api/tasks/:id`                    | Edit task fields                |
| PUT    | `/api/tasks/:id/move`               | Move between columns             |
| PUT    | `/api/tasks/:id/assign`             | Reassign                        |
| DELETE | `/api/tasks/:id`                    | Delete task                     |
| GET    | `/api/tasks/:id/comments`           | List comments                   |
| POST   | `/api/tasks/:id/comments`           | Add comment                     |
| GET    | `/api/notifications`                | List notifications              |
| PUT    | `/api/notifications/:id/read`       | Mark one as read                |

## Notes for production use

This is a learning/demo-ready build. Before shipping it for real users you'd
want to: move `JWT_SECRET` to a real secret manager, add rate limiting,
swap SQLite for Postgres if you need multi-instance scaling, add refresh
tokens, and add server-side validation with a schema library (e.g. Zod).
