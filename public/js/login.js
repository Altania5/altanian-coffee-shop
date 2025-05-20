document.addEventListener('DOMContentLoaded', () => {
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default page reload

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            loginMessage.textContent = ''; // Clear previous messages
            loginMessage.className = 'message'; // Reset class

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    // data should contain { success: true, message: '...', user: { id: '...', username: '...', role: '...' } }
                    if (data.user && data.user.role === 'admin') {
                        loginMessage.textContent = data.message || 'Admin login successful! Redirecting to admin menu...';
                        loginMessage.classList.add('success');
                        console.log('Admin login successful:', data.user);
                        window.location.href = '/admin/menu'; // Redirect admin to admin menu
                    } else if (data.user) { // For any other logged-in user (e.g., 'customer')
                        loginMessage.textContent = data.message || 'Login successful! Redirecting to menu...';
                        loginMessage.classList.add('success');
                        console.log('User login successful:', data.user);
                        window.location.href = '/menu.html'; // Redirect regular user to public menu
                    } else {
                        // Should not happen if response.ok and login is successful, but good to have a fallback
                        loginMessage.textContent = 'Login successful, but user data not found. Redirecting to menu.';
                        loginMessage.classList.add('success');
                        window.location.href = '/menu';
                    }
                } else {
                    loginMessage.textContent = data.message || 'Login failed. Please try again.';
                    loginMessage.classList.add('error');
                }
            } catch (error) {
                console.error('Login error:', error);
                loginMessage.textContent = 'An error occurred during login. Please try again.';
                loginMessage.classList.add('error');
            }
        });
    }
});