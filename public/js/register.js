document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');
      if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            registerMessage.textContent = '';
            registerMessage.className = 'message';

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    registerMessage.textContent = data.message || 'Registration successful! Please log in.';
                    registerMessage.classList.add('success');
                    // Optionally redirect to login page or clear form
                    // window.location.href = '/';
                    registerForm.reset();
                } else {
                    registerMessage.textContent = data.message || 'Registration failed. Please try again.';
                    registerMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                registerMessage.textContent = 'An error occurred. Please try again.';
                registerMessage.classList.add('error');
            }
        });
    }
});