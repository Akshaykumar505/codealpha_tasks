# ✨ Connectly — Mini Social Media Platform

**🔗 Live Demo:** [social-media-app-iota-five.vercel.app](https://social-media-app-iota-five.vercel.app/pages/login.html)

A full-stack social media web app with user profiles, posts, comments, likes, and a follow system — built from scratch with Express.js, MongoDB, and vanilla JavaScript.

![Node.js](https://img.shields.io/badge/Node.js-Express.js-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

## 🚀 Features

- 🔐 **Authentication** — Register/Login with JWT tokens, bcrypt password hashing
- 👤 **User Profiles** — View & edit profile (bio, full name, avatar)
- 🤝 **Follow System** — Follow/unfollow other users
- 📝 **Posts** — Create posts with text and/or image upload (stored on Cloudinary)
- ❤️ **Likes** — Like/unlike posts
- 💬 **Comments** — Comment on posts
- 🔍 **Search** — Search users by username
- 🔔 **Notifications** — Get notified on follows, likes, and comments
- 🧑‍🤝‍🧑 **Suggested Users** — Discover new people to follow
- 🎨 **Modern UI** — Dark theme, gradient accents, 3-column responsive layout

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, Multer, Cloudinary, express-validator

**Frontend:** HTML5, CSS3 (custom design system), Vanilla JavaScript (no frameworks)

**Database:** MongoDB Atlas (cloud)

**Deployment:** Render (backend) · Vercel (frontend) · MongoDB Atlas (database) · Cloudinary (image storage)

---

## 📁 Project Structure
social-media-app/
├── backend/
│ ├── config/ # Database connection
│ ├── models/ # Mongoose schemas (User, Post, Comment, Notification)
│ ├── controllers/ # Route logic
│ ├── routes/ # API endpoints
│ ├── middleware/ # Auth guard, validation, error handling, file upload
│ ├── utils/ # Helper functions (JWT generation)
│ └── server.js # App entry point
└── frontend/
├── css/ # Design system + page styles
├── js/ # Page logic (API calls, DOM handling)
└── pages/ # HTML pages (login, register, feed, profile)

---

## ⚙️ Setup & Installation (Run Locally)

### 1. Clone the repo
```bash
git clone https://github.com/Akshaykumar505/social-media-app.git
cd social-media-app
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://127.0.0.1:5500
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the server:
```bash
node server.js
```

### 3. Frontend Setup
Open `frontend/pages/login.html` using VS Code's **Live Server** extension.

> Note: `frontend/js/api.js` currently points to the deployed Render backend. To run fully locally, change `API_BASE` back to `http://localhost:5000/api`.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |
| GET | `/api/users/search?q=` | Search users | ❌ |
| GET | `/api/users/suggestions` | Get suggested users | ✅ |
| GET | `/api/users/:username` | Get user profile | ❌ |
| PUT | `/api/users/profile` | Update own profile | ✅ |
| PUT | `/api/users/follow/:id` | Follow/unfollow a user | ✅ |
| GET | `/api/posts` | Get feed (paginated) | ❌ |
| POST | `/api/posts` | Create a post | ✅ |
| PUT | `/api/posts/:id` | Edit own post | ✅ |
| DELETE | `/api/posts/:id` | Delete own post | ✅ |
| PUT | `/api/posts/:id/like` | Like/unlike a post | ✅ |
| GET | `/api/posts/:postId/comments` | Get comments on a post | ❌ |
| POST | `/api/posts/:postId/comments` | Add a comment | ✅ |
| GET | `/api/notifications` | Get notifications | ✅ |
| PUT | `/api/notifications/read` | Mark all as read | ✅ |

---

## 🔒 Security Practices

- Passwords hashed with bcrypt (never stored in plain text)
- JWT-based authentication with token expiry
- Input validation on all write endpoints
- User can only edit/delete their own content
- File upload restricted to image types, 5MB max, stored on Cloudinary (not the server disk)

---

## 👨‍💻 Author

Built by **Akshaykumar505** as a learning project — full-stack development from scratch, including deployment.