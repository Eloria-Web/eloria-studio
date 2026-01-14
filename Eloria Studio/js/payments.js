// Payment handling for PayPal and Stripe
// Replace YOUR_PAYPAL_CLIENT_ID and YOUR_STRIPE_PUBLISHABLE_KEY with real values
// Precios actualizados según el sitio real: Creator $20, Business $65, Agency $180

const STRIPE_PUBLISHABLE_KEY = 'YOUR_STRIPE_PUBLISHABLE_KEY'; // Reemplazar con tu key real
const PAYPAL_CLIENT_ID = 'YOUR_PAYPAL_CLIENT_ID'; // Reemplazar con tu Client ID real

let stripe = null;
if (STRIPE_PUBLISHABLE_KEY !== 'YOUR_STRIPE_PUBLISHABLE_KEY') {
  stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
}

// PayPal Checkout
async function checkoutWithPayPal(planType, amount) {
  // Check if user is logged in
  if (!window.supabaseClient) {
    alert('Please log in first');
    window.location.href = '/login.html';
    return;
  }

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    alert('Please log in first');
    window.location.href = '/login.html';
    return;
  }

  const user = session.user;

  // Show PayPal button container
  const container = document.getElementById('paypal-button-container');
  container.style.display = 'block';
  container.innerHTML = ''; // Clear previous buttons

  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: {
            value: amount.toString(),
            currency_code: 'EUR',
            description: `Eloria Studio - ${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`
          }
        }],
        application_context: {
          brand_name: 'Eloria Studio',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      });
    },
    onApprove: async function(data, actions) {
      try {
        const details = await actions.order.capture();
        
        console.log('Pago completado:', details);
        
        // Save payment to Supabase
        const { error: paymentError } = await window.supabaseClient
          .from('payments')
          .insert({
            user_id: user.id,
            email: user.email,
            amount: parseFloat(details.purchase_units[0].amount.value),
            currency: 'EUR',
            status: 'completed',
            payment_method: 'paypal',
            transaction_id: details.id,
            plan_type: planType,
            created_at: new Date().toISOString()
          });

        if (paymentError) {
          console.error('Error saving payment:', paymentError);
        }

        // Update user plan
        const { error: userError } = await window.supabaseClient
          .from('users')
          .update({
            plan: planType,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (userError) {
          console.error('Error updating user plan:', userError);
        }

        // Success message
        alert('¡Pago exitoso! Gracias ' + (details.payer.name?.given_name || '') + '. Redirigiendo al dashboard...');
        
        // Redirect to dashboard
        window.location.href = '/dashboard.html?payment=success';
      } catch (error) {
        console.error('Error processing payment:', error);
        alert('Ocurrió un error procesando el pago. Por favor contacta soporte.');
      }
    },
    onError: function(err) {
      console.error('Error en el pago PayPal:', err);
      alert('Ocurrió un error con el pago. Inténtalo de nuevo.');
      container.style.display = 'none';
    },
    onCancel: function(data) {
      console.log('Pago cancelado');
      container.style.display = 'none';
    }
  }).render('#paypal-button-container');
}

// Stripe Checkout
async function checkoutWithStripe(planType, amount) {
  // Check if user is logged in
  if (!window.supabaseClient) {
    alert('Please log in first');
    window.location.href = '/login.html';
    return;
  }

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    alert('Please log in first');
    window.location.href = '/login.html';
    return;
  }

  if (!stripe) {
    alert('Stripe not configured. Please contact support.');
    return;
  }

  const user = session.user;

  try {
    // Get Stripe Price ID based on plan
    const priceIds = {
      creator: window.STRIPE_PRICE_CREATOR || 'price_creator_monthly',
      business: window.STRIPE_PRICE_BUSINESS || 'price_business_monthly',
      agency: window.STRIPE_PRICE_AGENCY || 'price_agency_monthly'
    };

    const priceId = priceIds[planType];

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      lineItems: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      successUrl: `${window.location.origin}/dashboard.html?payment=success`,
      cancelUrl: `${window.location.origin}/pricing.html?payment=cancel`,
      customerEmail: user.email,
      subscriptionData: {
        trial_period_days: 14,
        metadata: {
          plan: planType,
          userId: user.id
        }
      }
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert(error.message || 'Something went wrong. Please try again.');
  }
}
