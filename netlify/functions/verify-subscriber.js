// SpeckyTec — Stripe Subscriber Verification Function
// Netlify serverless function — runs on the server, never exposed to browser
// Checks whether an email address has an active Stripe subscription

exports.handler = async function(event, context) {

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Parse the request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request' })
    };
  }

  const { email } = body;

  // Validate email
  if (!email || !email.includes('@')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid email address required' })
    };
  }

  // Get environment variables (stored securely in Netlify)
  const stripeKey = process.env.STRIPE_RESTRICTED_KEY;
  const librarySecret = process.env.LIBRARY_SECRET;

  if (!stripeKey || !librarySecret) {
    console.error('Missing environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    // Step 1: Search for customer by email in Stripe
    const customerResponse = await fetch(
      `https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const customerData = await customerResponse.json();

    // No customer found with this email
    if (!customerData.data || customerData.data.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          active: false,
          message: 'No subscription found for this email address'
        })
      };
    }

    const customerId = customerData.data[0].id;
    const customerName = customerData.data[0].name || email.split('@')[0];

    // Step 2: Check for active subscriptions for this customer
    const subscriptionResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const subscriptionData = await subscriptionResponse.json();

    // Check if active subscription exists
    const hasActiveSubscription = subscriptionData.data &&
                                   subscriptionData.data.length > 0;

    if (hasActiveSubscription) {
      // Generate a simple session token
      const token = Buffer.from(
        `${email}:${librarySecret}:${Date.now()}`
      ).toString('base64');

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          active: true,
          name: customerName,
          token: token,
          message: 'Active subscription verified'
        })
      };
    } else {
      // Customer exists but no active subscription
      return {
        statusCode: 200,
        body: JSON.stringify({
          active: false,
          message: 'No active subscription found. Please subscribe to access the library.'
        })
      };
    }

  } catch (error) {
    console.error('Stripe verification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Verification failed. Please try again or contact hello@speckytec.com'
      })
    };
  }
};
