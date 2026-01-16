// Netlify Function: Stripe Webhook Handler
// Handles Stripe events: checkout.session.completed, subscription.updated, subscription.deleted

const Stripe = require('stripe');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` })
    };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object, stripe);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object, stripe);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object, stripe);
        break;

      case 'invoice.payment_succeeded':
        console.log('Payment succeeded:', stripeEvent.data.object.id);
        break;

      case 'invoice.payment_failed':
        console.log('Payment failed:', stripeEvent.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function handleCheckoutCompleted(session, stripe) {
  const customerEmail = session.customer_email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const plan = session.metadata?.plan || 'creator';

  // Get subscription details to check trial end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const trialEndsAt = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000)
    : null;

  // Update user in Firebase Firestore
  // Note: This requires Firebase Admin SDK
  // For now, we'll log the data - you'll need to implement Firebase Admin
  console.log('Checkout completed:', {
    email: customerEmail,
    customerId: customerId,
    subscriptionId: subscriptionId,
    plan: plan,
    trialEndsAt: trialEndsAt
  });

  // TODO: Update Firestore using Firebase Admin SDK
  // const admin = require('firebase-admin');
  // const userRef = admin.firestore().collection('users').where('email', '==', customerEmail);
  // await userRef.update({
  //   plan: plan,
  //   stripeCustomerId: customerId,
  //   subscriptionId: subscriptionId,
  //   subscriptionStatus: subscription.status,
  //   trialEndsAt: trialEndsAt
  // });
}

async function handleSubscriptionUpdated(subscription, stripe) {
  const customerId = subscription.customer;
  const status = subscription.status;
  const trialEndsAt = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000)
    : null;

  console.log('Subscription updated:', {
    customerId: customerId,
    status: status,
    trialEndsAt: trialEndsAt
  });

  // TODO: Update Firestore
}

async function handleSubscriptionDeleted(subscription, stripe) {
  const customerId = subscription.customer;

  console.log('Subscription deleted:', {
    customerId: customerId
  });

  // TODO: Update Firestore - set plan to 'free'
}
