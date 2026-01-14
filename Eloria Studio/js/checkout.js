// Checkout functionality with Stripe and PayPal
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in
  if (!window.supabaseClient) {
    console.error('Supabase not initialized');
    return;
  }

  // Check current session
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  
  if (!session) {
    // User not logged in - show message
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = 'Please log in to continue';
    }
    return;
  }

  // User is logged in - proceed with checkout
  await initializeCheckout(session.user);
});

async function initializeCheckout(user) {
  const urlParams = new URLSearchParams(window.location.search);
  const planParam = urlParams.get('plan') || 'creator';

  // Plan configurations
  const plans = {
    creator: {
      name: 'Creator',
      price: 29,
      priceId: window.STRIPE_PRICE_CREATOR || 'price_creator_monthly',
      features: [
        'Up to 3 brands',
        'Standard analytics and basic reports',
        'Limited AI assistance'
      ]
    },
    business: {
      name: 'Business',
      price: 79,
      priceId: window.STRIPE_PRICE_BUSINESS || 'price_business_monthly',
      features: [
        'Up to 10 brands and workspaces',
        'Advanced analytics and custom reports',
        'Full Inbox and unlimited SmartLinks'
      ]
    },
    agency: {
      name: 'Agency',
      price: 199,
      priceId: window.STRIPE_PRICE_AGENCY || 'price_agency_monthly',
      features: [
        'Unlimited brands and client workspaces',
        'White-label reports and approvals',
        'Priority support and volume discounts'
      ]
    }
  };

  const selectedPlan = plans[planParam] || plans.creator;

  // Update UI with plan info
  document.getElementById('summaryPlan').querySelector('.summary-plan__name').textContent = `${selectedPlan.name} Plan`;
  document.getElementById('summaryPrice').textContent = `$${selectedPlan.price}/month`;
  document.getElementById('subtotal').textContent = `$${selectedPlan.price}/month`;
  document.getElementById('total').textContent = `$${selectedPlan.price}/month`;

  const featuresList = document.getElementById('summaryFeatures').querySelector('ul');
  featuresList.innerHTML = selectedPlan.features.map(f => `<li>${f}</li>`).join('');

  // Initialize Stripe
  const stripePublishableKey = window.STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
  const stripe = Stripe(stripePublishableKey);
  
  // Handle checkout button
  const checkoutBtn = document.getElementById('checkoutBtn');
  const paymentSection = document.getElementById('paymentSection');

  // Update payment section
  paymentSection.innerHTML = `
    <h3 class="checkout-subtitle">Payment Method</h3>
    <p class="checkout-note">Click below to proceed to secure Stripe Checkout</p>
    <button type="button" id="checkoutBtn" class="btn btn--primary btn--full">
      Start Free Trial
    </button>
  `;

  const newCheckoutBtn = document.getElementById('checkoutBtn');
  
  newCheckoutBtn.addEventListener('click', async function() {
    this.disabled = true;
    this.textContent = 'Processing...';

    try {
      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{
          price: selectedPlan.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/dashboard.html?payment=success`,
        cancelUrl: `${window.location.origin}/pricing.html?payment=cancel`,
        customerEmail: user.email,
        subscriptionData: {
          trial_period_days: 14,
          metadata: {
            plan: planParam,
            userId: user.uid
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      this.disabled = false;
      this.textContent = 'Start Free Trial';
      alert(error.message || 'Something went wrong. Please try again.');
    }
  });
}
