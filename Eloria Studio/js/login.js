// Login form handling with Supabase
document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const rememberMeInput = document.getElementById('rememberMe');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('authMessage');

  // Check if there's a redirect parameter
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect') || '/dashboard.html';

  // Check if redirected from email verification
  if (urlParams.get('verified') === 'true') {
    messageDiv.className = 'auth-message auth-message--success';
    messageDiv.textContent = 'Email verified! You can now log in.';
  }

  // Form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    messageDiv.textContent = '';
    messageDiv.className = 'auth-message';

    // Validate form
    const email = emailInput.value.trim();
    if (!email) {
      showError('emailError', 'Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      showError('emailError', 'Please enter a valid email');
      return;
    }

    if (!passwordInput.value) {
      showError('passwordError', 'Password is required');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      if (!window.supabaseClient) {
        throw new Error('Supabase not initialized');
      }

      // Sign in with Supabase Auth
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: passwordInput.value
      });

      if (error) {
        throw error;
      }

      // Success - redirect
      if (window.gtag) {
        window.gtag('event', 'login', {
          method: 'email'
        });
      }

      window.location.href = redirectUrl;

    } catch (error) {
      console.error('Login error:', error);
      
      messageDiv.className = 'auth-message auth-message--error';
      
      // Handle specific error messages
      if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
        messageDiv.textContent = 'Invalid email or password. Please check your credentials and try again.';
        document.getElementById('passwordError').textContent = 'Invalid credentials';
      } else if (error.message.includes('Email not confirmed')) {
        messageDiv.innerHTML = `
          <strong>Email not verified</strong><br>
          Please check your email and click the verification link before logging in.
        `;
      } else {
        messageDiv.textContent = error.message || 'Something went wrong. Please try again.';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearErrors() {
    ['emailError', 'passwordError'].forEach(id => {
      const errorElement = document.getElementById(id);
      if (errorElement) {
        errorElement.textContent = '';
      }
    });
  }
});
