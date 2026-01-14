// Reset password handling with Firebase
document.addEventListener('DOMContentLoaded', async function() {
  const requestResetForm = document.getElementById('requestResetForm');
  
  if (requestResetForm) {
    requestResetForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const emailInput = document.getElementById('email');
      const submitBtn = document.getElementById('submitBtn');
      const messageDiv = document.getElementById('authMessage');
      const emailError = document.getElementById('emailError');

      // Clear errors
      messageDiv.textContent = '';
      messageDiv.className = 'auth-message';
      emailError.textContent = '';

      const email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      try {
        if (!window.supabaseClient) {
          throw new Error('Supabase not initialized');
        }

        // Send password reset email
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) {
          throw error;
        }

        messageDiv.className = 'auth-message auth-message--success';
        messageDiv.innerHTML = `
          <strong>Check your email!</strong><br>
          We've sent a password reset link to <strong>${email}</strong>.<br>
          Click the link in the email to reset your password.
        `;

        emailInput.disabled = true;
        submitBtn.style.display = 'none';

      } catch (error) {
        console.error('Reset password error:', error);
        messageDiv.className = 'auth-message auth-message--error';
        
        if (error.message.includes('not found')) {
          messageDiv.textContent = 'No account found with this email address.';
        } else {
          messageDiv.textContent = error.message || 'Something went wrong. Please try again.';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Reset Link';
      }
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});
