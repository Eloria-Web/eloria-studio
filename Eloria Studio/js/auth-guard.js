// Auth guard - protects routes that require authentication
// Add this script to any page that should be protected (dashboard, settings, etc.)

(async function() {
  // Wait for Supabase to initialize
  if (!window.supabaseClient) {
    // If firebase-init.js hasn't loaded, wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!window.supabaseClient) {
    console.error('Supabase not initialized');
    return;
  }

  // Check for active session
  const { data: { session }, error } = await window.supabaseClient.auth.getSession();

  if (!session || error) {
    // No session found, redirect to login
    const currentPath = window.location.pathname;
    const returnUrl = encodeURIComponent(currentPath);
    window.location.href = `/login.html?redirect=${returnUrl}`;
    return;
  }

  // Session exists, allow access
  window.currentUser = session.user;

  // Optional: Set up auth state change listener
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = '/login.html';
    }
  });
})();
