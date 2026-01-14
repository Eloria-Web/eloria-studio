// Dashboard functionality with Supabase
document.addEventListener('DOMContentLoaded', async function() {
  if (!window.supabaseClient) {
    console.error('Supabase not initialized');
    return;
  }

  // Check for payment success message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    const alert = document.getElementById('paymentSuccessAlert');
    if (alert) {
      alert.style.display = 'block';
      setTimeout(() => {
        alert.style.display = 'none';
      }, 5000);
    }
  }

  // Load user data
  await loadUserData();

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      await window.supabaseClient.auth.signOut();
      window.location.href = '/';
    });
  }
});

async function loadUserData() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('No user found:', userError);
      return;
    }

    // Update user info in UI
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const userEmail = user.email || '';
    
    document.getElementById('welcomeName').textContent = userName;
    document.getElementById('userName').textContent = userName;
    document.getElementById('userEmail').textContent = userEmail;
    
    // Set avatar initial
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.textContent = userName.charAt(0).toUpperCase();
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting profile:', profileError);
      // Create profile if it doesn't exist
      const { error: insertError } = await window.supabaseClient
        .from('users')
        .insert({
          id: user.id,
          email: userEmail,
          plan: 'free',
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
      updatePlanDisplay('free', null, null);
    } else if (profile) {
      updatePlanDisplay(profile.plan || 'free', profile.subscription_status, profile.trial_ends_at);
    } else {
      updatePlanDisplay('free', null, null);
    }

  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updatePlanDisplay(plan, subscriptionStatus, trialEndsAt) {
  const planNames = {
    free: 'Free',
    creator: 'Creator',
    business: 'Business',
    agency: 'Agency'
  };

  const planName = planNames[plan] || 'Free';
  
  // Update plan badges
  document.getElementById('planName').textContent = `${planName} Plan`;
  document.getElementById('planNameLarge').textContent = planName;

  // Update status
  const statusBadge = document.getElementById('planStatus');
  const planDetails = document.getElementById('planDetails');
  const trialInfo = document.getElementById('trialInfo');
  const upgradeBtn = document.getElementById('upgradeBtn');

  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    const daysLeft = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      statusBadge.innerHTML = '<span class="status-badge status-badge--trial">Trial</span>';
      planDetails.style.display = 'none';
      trialInfo.style.display = 'block';
      document.getElementById('trialDays').textContent = daysLeft;
    } else {
      statusBadge.innerHTML = '<span class="status-badge status-badge--active">Active</span>';
      planDetails.innerHTML = '<p>Your subscription is active</p>';
      trialInfo.style.display = 'none';
    }
  } else if (subscriptionStatus === 'active') {
    statusBadge.innerHTML = '<span class="status-badge status-badge--active">Active</span>';
    planDetails.innerHTML = '<p>Your subscription is active</p>';
    trialInfo.style.display = 'none';
  } else {
    statusBadge.innerHTML = '<span class="status-badge status-badge--inactive">Inactive</span>';
    planDetails.innerHTML = '<p>You\'re on the free plan</p>';
    trialInfo.style.display = 'none';
  }

  // Show upgrade button for free/creator plans
  if (plan === 'free' || plan === 'creator') {
    upgradeBtn.style.display = 'inline-flex';
  } else {
    upgradeBtn.style.display = 'none';
  }

  // Update plan badge color
  const planBadge = document.getElementById('planBadge');
  planBadge.className = `plan-badge plan-badge--${plan}`;
}
