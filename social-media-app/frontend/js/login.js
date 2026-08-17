// Agar user pehle se logged in hai, seedha feed pe bhej do
if (localStorage.getItem('token')) {
  window.location.href = 'feed.html';
}

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // page reload hone se rokta hai

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  errorMsg.classList.add('hidden');

  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const data = await api.post('/auth/login', { email, password });

    // Token aur user data browser me save karna, taaki dobara login na karna pade
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    window.location.href = 'feed.html';
  } catch (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});