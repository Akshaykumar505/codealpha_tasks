const notifBellBtn = document.getElementById('notifBellBtn');
const notifDropdown = document.getElementById('notifDropdown');
const notifBadge = document.getElementById('notifBadge');
const notifList = document.getElementById('notifList');

// Notification text generate karna type ke hisaab se
function getNotifText(notif) {
  const name = notif.sender.fullName || notif.sender.username;
  switch (notif.type) {
    case 'follow':
      return `<strong>${escapeHtml(name)}</strong> started following you`;
    case 'like':
      return `<strong>${escapeHtml(name)}</strong> liked your post`;
    case 'comment':
      return `<strong>${escapeHtml(name)}</strong> commented on your post`;
    default:
      return `<strong>${escapeHtml(name)}</strong> interacted with your content`;
  }
}

// Unread count check karna aur badge update karna (bell pe number)
async function refreshNotifBadge() {
  try {
    const data = await api.get('/notifications');
    if (data.unreadCount > 0) {
      notifBadge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Failed to load notification count:', error);
  }
}

// Poori list load karke dropdown me dikhana
async function loadNotifList() {
  notifList.innerHTML = '<p class="notif-empty">Loading...</p>';

  try {
    const data = await api.get('/notifications');

    if (data.notifications.length === 0) {
      notifList.innerHTML = '<p class="notif-empty">No notifications yet</p>';
      return;
    }

    notifList.innerHTML = data.notifications
      .map(
        (notif) => `
      <div class="notif-item ${notif.read ? '' : 'unread'}">
        ${renderAvatar(notif.sender, 'avatar-sm')}
        <div>
          <div class="notif-text">${getNotifText(notif)}</div>
          <div class="notif-time">${timeAgo(notif.createdAt)}</div>
        </div>
      </div>
    `
      )
      .join('');

    // Dropdown khulte hi sab read mark kar do, aur badge hata do
    if (data.unreadCount > 0) {
      await api.put('/notifications/read');
      notifBadge.classList.add('hidden');
    }
  } catch (error) {
    notifList.innerHTML = `<p class="notif-empty">Failed to load notifications</p>`;
  }
}

// Bell button click -> dropdown toggle
notifBellBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  const isHidden = notifDropdown.classList.contains('hidden');
  notifDropdown.classList.toggle('hidden');

  if (isHidden) {
    await loadNotifList();
  }
});

// Bahar click karne pe dropdown band ho jaaye
document.addEventListener('click', (e) => {
  if (!e.target.closest('.notif-bell-wrap')) {
    notifDropdown.classList.add('hidden');
  }
});

// Page load hote hi ek baar badge check kar lo
refreshNotifBadge();
