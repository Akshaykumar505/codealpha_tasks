// Agar login nahi hai, toh login page pe bhej do (protected pages ke liye)
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(localStorage.getItem('user'));
}

// Logout karna
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Naam se initials banana (jaise "John Doe" -> "JD"), avatar ke liye
function getInitials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Avatar HTML banana - agar image hai toh image, nahi toh initials
function renderAvatar(user, sizeClass = 'avatar-md') {
  const displayName = user.fullName || user.username || '?';
  if (user.avatar) {
    return `<img src="http://localhost:5000${user.avatar}" class="avatar ${sizeClass}" alt="${displayName}" />`;
  }
  return `<div class="avatar ${sizeClass}">${getInitials(displayName)}</div>`;
}
// Sirf avatar ke andar wala content deta hai (image ya initials), taaki existing div me daala ja sake
function renderAvatarInner(user) {
  const displayName = user.fullName || user.username || '?';
  if (user.avatar) {
    return `<img src="http://localhost:5000${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${escapeHtml(displayName)}" />`;
  }
  return getInitials(displayName);
}

// Date ko "2h ago" jaise readable format me dikhana
function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);

  const intervals = [
    { label: 'y', secs: 31536000 },
    { label: 'mo', secs: 2592000 },
    { label: 'd', secs: 86400 },
    { label: 'h', secs: 3600 },
    { label: 'm', secs: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.secs);
    if (count >= 1) return `${count}${interval.label} ago`;
  }
  return 'just now';
}

// User ke type kiye text ko safe banana (XSS attacks se bachne ke liye)
// Isse koi user <script> tags likh ke doosron ko harm nahi pahucha sakta
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}