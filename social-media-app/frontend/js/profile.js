const currentUser = requireAuth();

document.getElementById('logoutBtn').addEventListener('click', logout);

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

// Right sidebar - suggested users
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

document.getElementById('suggestionsList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.suggestion-follow-btn');
  if (!btn) return;

  const userId = btn.dataset.id;
  btn.disabled = true;

  try {
    await api.put(`/users/follow/${userId}`, {});
    btn.closest('.suggestion-item').remove();
  } catch (error) {
    alert('Failed to follow: ' + error.message);
    btn.disabled = false;
  }
});

// URL se username nikalna, jaise profile.html?username=testuser
const params = new URLSearchParams(window.location.search);
const profileUsername = params.get('username') || currentUser.username;

const profileHeaderCard = document.getElementById('profileHeaderCard');
const userPostsContainer = document.getElementById('userPostsContainer');

let profileUserId = null; // baad me follow button ke liye chahiye hoga

async function loadProfile() {
  try {
    const data = await api.get(`/users/${profileUsername}`);
    const user = data.user;
    profileUserId = user.id;

    const isOwnProfile = user.id === currentUser.id;

    profileHeaderCard.innerHTML = `
      <div class="profile-top">
        ${renderAvatar(user, 'avatar-lg')}
        <div class="profile-info">
          <h2 class="profile-name">${escapeHtml(user.fullName || user.username)}</h2>
          <p class="profile-username">@${escapeHtml(user.username)}</p>
          ${user.bio ? `<p class="profile-bio">${escapeHtml(user.bio)}</p>` : ''}
          <div class="profile-stats">
            <div><span class="profile-stat-value">${user.followersCount}</span> <span class="profile-stat-label">Followers</span></div>
            <div><span class="profile-stat-value">${user.followingCount}</span> <span class="profile-stat-label">Following</span></div>
          </div>
        </div>
      </div>

      ${
        isOwnProfile
          ? `<button class="btn btn-secondary" id="editProfileBtn">Edit Profile</button>
             <div class="edit-profile-form hidden" id="editProfileForm">
               <div class="input-group">
                 <label>Full Name</label>
                 <input type="text" id="editFullName" class="input" value="${escapeHtml(user.fullName || '')}" />
               </div>
               <div class="input-group">
                 <label>Bio</label>
                 <textarea id="editBio" class="input" rows="2">${escapeHtml(user.bio || '')}</textarea>
               </div>
               <div class="edit-profile-actions">
                 <button class="btn btn-primary" id="saveProfileBtn">Save</button>
                 <button class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
               </div>
             </div>`
          : `<button class="btn ${user.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="followBtn" data-id="${user.id}">
               ${user.isFollowing ? 'Following' : 'Follow'}
             </button>`
      }
    `;

    if (isOwnProfile) {
      setupEditProfile();
    } else {
      setupFollowButton();
    }
  } catch (error) {
    profileHeaderCard.innerHTML = `<p class="error-text">Failed to load profile: ${error.message}</p>`;
  }
}

loadProfile();

// ===== EDIT PROFILE =====
function setupEditProfile() {
  const editBtn = document.getElementById('editProfileBtn');
  const form = document.getElementById('editProfileForm');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');

  editBtn.addEventListener('click', () => {
    form.classList.toggle('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    form.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const fullName = document.getElementById('editFullName').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const data = await api.put('/users/profile', { fullName, bio });

      // localStorage me bhi updated data save karna, taaki navbar sahi dikhe
      const updatedUser = { ...currentUser, fullName: data.user.fullName, bio: data.user.bio };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      await loadProfile(); // profile reload karo naye data ke saath
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });
}

// ===== FOLLOW / UNFOLLOW =====
function setupFollowButton() {
  const followBtn = document.getElementById('followBtn');
  if (!followBtn) return;

  followBtn.addEventListener('click', async () => {
    followBtn.disabled = true;

    try {
      const data = await api.put(`/users/follow/${profileUserId}`, {});
      followBtn.textContent = data.isFollowing ? 'Following' : 'Follow';
      followBtn.classList.toggle('btn-primary', !data.isFollowing);
      followBtn.classList.toggle('btn-secondary', data.isFollowing);
      await loadProfile(); // followers count refresh karne ke liye
    } catch (error) {
      alert('Failed to follow/unfollow: ' + error.message);
    } finally {
      followBtn.disabled = false;
    }
  });
}

// ===== USER KE POSTS LOAD KARNA =====
async function loadUserPosts() {
  try {
    const data = await api.get(`/users/${profileUsername}`);
    const userId = data.user.id;

    const postsData = await api.get(`/posts?author=${userId}`);

    if (postsData.posts.length === 0) {
      userPostsContainer.innerHTML = '<p class="text-muted">No posts yet.</p>';
      return;
    }

    userPostsContainer.innerHTML = postsData.posts
      .map(
        (post) => `
      <div class="card post-card">
        <div class="post-header">
          ${renderAvatar(post.author, 'avatar-md')}
          <div class="post-header-info">
            <div class="post-author-name">${escapeHtml(post.author.fullName || post.author.username)}</div>
            <div class="post-time">${timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${post.image ? `<img src="${post.image}" class="post-image" alt="post" />` : ''}
        <div class="post-stats">
          <span>${post.likesCount || 0} likes</span>
        </div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    userPostsContainer.innerHTML = `<p class="error-text">Failed to load posts</p>`;
  }
}

loadUserPosts();