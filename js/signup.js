// Signup form handling with Supabase
document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('signupForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const submitBtn = document.getElementById('submitBtn');
  const messageDiv = document.getElementById('authMessage');

  // Password strength indicator
  passwordInput.addEventListener('input', function() {
    const password = this.value;
    const strength = calculatePasswordStrength(password);
    updatePasswordStrength(strength);
  });

  // Confirm password validation
  confirmPasswordInput.addEventListener('input', function() {
    validatePasswordMatch();
  });

  // Form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    messageDiv.textContent = '';
    messageDiv.className = 'auth-message';

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!window.supabaseClient) {
        throw new Error('Supabase not initialized');
      }

      // Create user with Supabase Auth
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/login.html?verified=true`
        }
      });

      if (error) {
        throw error;
      }

      // Create user profile in Supabase database
      if (data.user) {
        const { error: dbError } = await window.supabaseClient
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            plan: 'free',
            created_at: new Date().toISOString()
          });

        if (dbError && !dbError.message.includes('duplicate')) {
          console.error('Error creating user profile:', dbError);
        }
      }

      // Success - show verification message
      messageDiv.className = 'auth-message auth-message--success';
      messageDiv.innerHTML = `
        <strong>Check your email!</strong><br>
        We've sent a verification link to <strong>${email}</strong>.<br>
        Click the link in the email to verify your account.
      `;
      
      form.reset();
      updatePasswordStrength({ level: 0, text: 'Password strength' });
      
      // Track signup event
      if (window.gtag) {
        window.gtag('event', 'signup', {
          method: 'email'
        });
      }

    } catch (error) {
      console.error('Signup error:', error);
      
      messageDiv.className = 'auth-message auth-message--error';
      
      // Handle specific error messages
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        messageDiv.textContent = 'This email is already registered. Try logging in instead.';
        document.getElementById('emailError').textContent = 'Email already in use';
      } else if (error.message.includes('Invalid email')) {
        messageDiv.textContent = 'Please enter a valid email address.';
        document.getElementById('emailError').textContent = 'Invalid email format';
      } else if (error.message.includes('Password')) {
        messageDiv.textContent = 'Password is too weak. Please use a stronger password.';
        document.getElementById('passwordError').textContent = 'Password too weak';
      } else {
        messageDiv.textContent = error.message || 'Something went wrong. Please try again.';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  function validateForm() {
    let isValid = true;

    // Email validation
    const email = emailInput.value.trim();
    if (!email) {
      showError('emailError', 'Email is required');
      isValid = false;
    } else if (!isValidEmail(email)) {
      showError('emailError', 'Please enter a valid email');
      isValid = false;
    }

    // Password validation
    const password = passwordInput.value;
    if (!password) {
      showError('passwordError', 'Password is required');
      isValid = false;
    } else if (password.length < 8) {
      showError('passwordError', 'Password must be at least 8 characters');
      isValid = false;
    }

    // Confirm password validation
    if (!validatePasswordMatch()) {
      isValid = false;
    }

    return isValid;
  }

  function validatePasswordMatch() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword && password !== confirmPassword) {
      showError('confirmPasswordError', 'Passwords do not match');
      return false;
    } else {
      clearError('confirmPasswordError');
      return true;
    }
  }

  function calculatePasswordStrength(password) {
    if (!password) return { level: 0, text: 'Password strength' };

    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength++;
    else feedback.push('at least 8 characters');

    if (password.length >= 12) strength++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    else feedback.push('mix of uppercase and lowercase');

    if (/\d/.test(password)) strength++;
    else feedback.push('include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    else feedback.push('include special characters');

    const levels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#F56565', '#ED8936', '#ECC94B', '#48BB78', '#38A169'];

    return {
      level: strength,
      text: strength > 0 ? levels[strength - 1] : 'Password strength',
      color: strength > 0 ? colors[strength - 1] : '#CBD5E0',
      feedback: feedback
    };
  }

  function updatePasswordStrength(strength) {
    const fill = document.getElementById('strengthFill');
    const text = document.getElementById('strengthText');
    
    if (!fill || !text) return;

    const percentage = (strength.level / 5) * 100;
    fill.style.width = `${percentage}%`;
    fill.style.backgroundColor = strength.color || '#CBD5E0';
    text.textContent = strength.text;
    text.style.color = strength.color || '#6B7280';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  function clearErrors() {
    ['emailError', 'passwordError', 'confirmPasswordError'].forEach(id => {
      clearError(id);
    });
  }
});
