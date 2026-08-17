const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

let debounceTimer;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = searchInput.value.trim();

  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  // Debounce: user ke typing rukne ke 300ms baad hi search karo,
  // taaki har letter pe API call na ho (performance ke liye zaroori)
  debounceTimer = setTimeout(() => performSearch(query), 300);
});

async function performSearch(query) {
  try {
    const data = await api.get(`/users/search?q=${encodeURIComponent(query)}`);

    if (data.users.length === 0) {
      searchResults.innerHTML = '<p class="text-muted" style="padding:12px;">No users found</p>';
    } else {
      searchResults.innerHTML = data.users
        .map(
          (user) => `
        <a href="profile.html?username=${user.username}" class="search-result-item">
          ${renderAvatar(user, 'avatar-sm')}
          <div>
            <div class="search-result-name">${escapeHtml(user.fullName || user.username)}</div>
            <div class="search-result-username">@${escapeHtml(user.username)}</div>
          </div>
        </a>
      `
        )
        .join('');
    }

    searchResults.classList.remove('hidden');
  } catch (error) {
    searchResults.innerHTML = `<p class="error-text" style="padding:12px;">Search failed</p>`;
    searchResults.classList.remove('hidden');
  }
}

// Bahar click karne pe results band ho jaayen
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) {
    searchResults.classList.add('hidden');
  }
});