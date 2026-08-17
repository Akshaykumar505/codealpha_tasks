// Login check - agar nahi hai toh login page pe bhej dega
const currentUser = requireAuth();

// Navbar me user ka naam/avatar dikhana
document.getElementById('navUsername').textContent = currentUser.username;
document.getElementById('navAvatar').innerHTML = renderAvatarInner(currentUser);
document.getElementById('createPostAvatar').innerHTML = renderAvatarInner(currentUser);
document.getElementById('navbarUser').addEventListener('click', () => {
  window.location.href = `profile.html?username=${currentUser.username}`;
});

// Left sidebar - apni profile info dikhana
document.getElementById('sidebarAvatar').innerHTML = renderAvatarInner(currentUser);
document.getElementById('sidebarName').textContent = currentUser.fullName || currentUser.username;
document.getElementById('sidebarUsername').textContent = '@' + currentUser.username;
document.getElementById('sidebarProfileLink').href = `profile.html?username=${currentUser.username}`;

// Sidebar ke stats (posts/followers/following) load karna
async function loadSidebarStats() {
  try {
    const data = await api.get(`/users/${currentUser.username}`);
    document.getElementById('statPosts').textContent = data.user.postsCount ?? 0;
    document.getElementById('statFollowers').textContent = data.user.followersCount ?? 0;
    document.getElementById('statFollowing').textContent = data.user.followingCount ?? 0;
  } catch (error) {
    console.error('Failed to load sidebar stats:', error);
  }
}

loadSidebarStats();

// Right sidebar - suggested users load karna
async function loadSuggestions() {
  const container = document.getElementById('suggestionsList');
  try {
    const data = await api.get('/users/suggestions');

    if (data.users.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size:13px;">No suggestions right now</p>';
      return;
    }

    container.innerHTML = data.users
      .map(
        (user) => `
      <div class="suggestion-item">
        <a href="profile.html?username=${user.username}">${renderAvatar(user, 'avatar-sm')}</a>
        <div class="suggestion-info">
          <a href="profile.html?username=${user.username}" class="suggestion-name">${escapeHtml(user.fullName || user.username)}</a>
          <div class="suggestion-username">@${escapeHtml(user.username)}</div>
        </div>
        <button class="btn btn-primary suggestion-follow-btn" data-id="${user.id}">Follow</button>
      </div>
    `
      )
      .join('');
  } catch (error) {
    container.innerHTML = '<p class="text-muted" style="font-size:13px;">Failed to load</p>';
  }
}

loadSuggestions();

document.getElementById('logoutBtn').addEventListener('click', logout);

const feedContainer = document.getElementById('feedContainer');

// Ek post ka HTML banata hai
function renderPostCard(post) {
  const isLiked = post.likes.includes(currentUser.id);
  const isOwner = post.author.id === currentUser.id;

  return `
    <div class="card post-card" data-post-id="${post.id}">
      <div class="post-header">
        ${renderAvatar(post.author, 'avatar-md')}
        <div class="post-header-info">
          <a href="profile.html?username=${post.author.username}" class="post-author-name">${escapeHtml(post.author.fullName || post.author.username)}</a>
          <div class="post-time">${timeAgo(post.createdAt)}</div>
        </div>
        ${isOwner ? `<button class="post-menu-btn delete-post-btn" data-id="${post.id}">⋮</button>` : ''}
      </div>

      <div class="post-content">${escapeHtml(post.content)}</div>

      ${post.image ? `<img src="${post.image}" class="post-image" alt="post image" />` : ''}

      <div class="post-stats">
        <span>${post.likesCount || 0} likes</span>
        <span class="comment-count-text">0 comments</span>
      </div>

      <div class="post-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${post.id}">
          ${isLiked ? '❤️' : '🤍'} Like
        </button>
        <button class="post-action-btn toggle-comments-btn" data-id="${post.id}">
          💬 Comment
        </button>
      </div>

      <div class="comments-section hidden" id="comments-${post.id}">
        <div class="comments-list"></div>
        <form class="comment-form" data-post-id="${post.id}">
          ${renderAvatar(currentUser, 'avatar-sm')}
          <input type="text" class="input comment-input" placeholder="Write a comment..." required />
        </form>
      </div>
    </div>
  `;
}

// Feed load karna backend se
async function loadFeed() {
  try {
    const data = await api.get('/posts');
    if (data.posts.length === 0) {
      feedContainer.innerHTML = '<p class="text-muted">No posts yet. Be the first to post!</p>';
      return;
    }
    feedContainer.innerHTML = data.posts.map(renderPostCard).join('');
  } catch (error) {
    feedContainer.innerHTML = `<p class="error-text">Failed to load feed: ${error.message}</p>`;
  }
}

loadFeed();

// ===== IMAGE PREVIEW =====
const postImageInput = document.getElementById('postImageInput');
const imagePreviewWrap = document.getElementById('imagePreviewWrap');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

postImageInput.addEventListener('change', () => {
  const file = postImageInput.files[0];
  if (file) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreviewWrap.classList.remove('hidden');
  }
});

removeImageBtn.addEventListener('click', () => {
  postImageInput.value = '';
  imagePreviewWrap.classList.add('hidden');
});

// ===== CREATE POST =====
const submitPostBtn = document.getElementById('submitPostBtn');
const postContent = document.getElementById('postContent');

submitPostBtn.addEventListener('click', async () => {
  const content = postContent.value.trim();
const hasImage = postImageInput.files.length > 0;

if (!content && !hasImage) {
  alert('Please write something or add an image');
  return;
}
  submitPostBtn.disabled = true;
  submitPostBtn.textContent = 'Posting...';

  try {
    const formData = new FormData();
    formData.append('content', content);
    if (postImageInput.files[0]) {
      formData.append('image', postImageInput.files[0]);
    }

    await api.post('/posts', formData);

    // Form reset karna
    postContent.value = '';
    postImageInput.value = '';
    imagePreviewWrap.classList.add('hidden');

    await loadFeed(); // feed refresh karo taaki naya post dikhe
  } catch (error) {
    alert('Failed to create post: ' + error.message);
  } finally {
    submitPostBtn.disabled = false;
    submitPostBtn.textContent = 'Post';
  }
});

// ===== EVENT DELEGATION =====
// Feed container pe ek hi listener - kyunki posts dynamically add hote hain,
// har post pe alag se listener lagana inefficient hoga
feedContainer.addEventListener('click', async (e) => {
  // LIKE button
  if (e.target.closest('.like-btn')) {
  const btn = e.target.closest('.like-btn');
  const postId = btn.dataset.id;

  try {
    const data = await api.put(`/posts/${postId}/like`, {});
    btn.classList.toggle('liked', data.isLiked);
    btn.innerHTML = `${data.isLiked ? '❤️' : '🤍'} Like`;

    // data-post-id se seedha post card dhoondna, DOM navigation pe depend na karna
    const statsSpan = document.querySelector(`[data-post-id="${postId}"] .post-stats span`);
    if (statsSpan) {
      statsSpan.textContent = `${data.likesCount} likes`;
    }
  } catch (error) {
    alert('Failed to like post: ' + error.message);
  }
}

  // COMMENT toggle button
  if (e.target.closest('.toggle-comments-btn')) {
    const postId = e.target.closest('.toggle-comments-btn').dataset.id;
    const section = document.getElementById(`comments-${postId}`);
    section.classList.toggle('hidden');

    if (!section.classList.contains('hidden')) {
      await loadComments(postId);
    }
  }

  // DELETE post button
  if (e.target.closest('.delete-post-btn')) {
    const postId = e.target.closest('.delete-post-btn').dataset.id;
    if (!confirm('Delete this post?')) return;

    try {
      await api.delete(`/posts/${postId}`);
      await loadFeed();
    } catch (error) {
      alert('Failed to delete post: ' + error.message);
    }
  }
});

// COMMENT form submit (event delegation for dynamically added forms)
feedContainer.addEventListener('submit', async (e) => {
  if (e.target.classList.contains('comment-form')) {
    e.preventDefault();
    const postId = e.target.dataset.postId;
    const input = e.target.querySelector('.comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
      await api.post(`/posts/${postId}/comments`, { text });
      input.value = '';
      await loadComments(postId);
    } catch (error) {
      alert('Failed to add comment: ' + error.message);
    }
  }
});

// Comments load karke dikhana
async function loadComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  const list = section.querySelector('.comments-list');

  try {
    const data = await api.get(`/posts/${postId}/comments`);
    list.innerHTML = data.comments
      .map(
        (c) => `
        <div class="comment-item">
          ${renderAvatar(c.author, 'avatar-sm')}
          <div class="comment-bubble">
            <span class="comment-author">${escapeHtml(c.author.username)}</span>
            <span class="comment-text">${escapeHtml(c.text)}</span>
          </div>
        </div>
      `
      )
      .join('');

    // Comment count update karna post card ke stats me
    const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    card.querySelector('.comment-count-text').textContent = `${data.comments.length} comments`;
  } catch (error) {
    list.innerHTML = `<p class="error-text">Failed to load comments</p>`;
  }
}

// Suggestions ke Follow buttons ke liye alag listener (kyunki wo feedContainer ke bahar hain)
document.getElementById('suggestionsList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.suggestion-follow-btn');
  if (!btn) return;

  const userId = btn.dataset.id;
  btn.disabled = true;

  try {
    await api.put(`/users/follow/${userId}`, {});
    btn.closest('.suggestion-item').remove(); // follow karte hi list se hata do
  } catch (error) {
    alert('Failed to follow: ' + error.message);
    btn.disabled = false;
  }
});
