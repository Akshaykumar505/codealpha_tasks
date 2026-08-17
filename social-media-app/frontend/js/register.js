if (localStorage.getItem('token')) {
  window.location.href = 'feed.html';
}

const registerForm = document.getElementById('registerForm');
const errorMsg = document.getElementById('errorMsg');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  errorMsg.classList.add('hidden');

  const submitBtn = registerForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const data = await api.post('/auth/register', { username, fullName, email, password });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    window.location.href = 'feed.html';
  } catch (error) {
    errorMsg.textContent = error.message;
    errorMsg.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign Up';
  }
});