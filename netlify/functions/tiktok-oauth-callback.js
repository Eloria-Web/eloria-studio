const crypto = require('crypto');

function base64urlToString(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(padded, 'base64');
  return buffer.toString('utf-8');
}

function verifyState(state) {
  const secret = process.env.OAUTH_STATE_SECRET || 'dev-secret';
  const [payload, signature] = state.split('.');
  if (!payload || !signature) {
    return null;
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected !== signature) {
    return null;
  }
  return JSON.parse(base64urlToString(payload));
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase service credentials');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Supabase request failed');
  }

  return response.json().catch(() => ({}));
}

const PLAN_LIMITS = {
  free: { brands: 1, networks: 2, monthly_posts: 10 },
  creator: { brands: 3, networks: 5, monthly_posts: 50 },
  business: { brands: 10, networks: 10, monthly_posts: 200 },
  professional: { brands: 25, networks: 20, monthly_posts: 1000 }
};

async function getUserPlan(userId) {
  const [plan] = await supabaseRequest(`user_plans?user_id=eq.${userId}&limit=1`);
  return plan?.plan || 'free';
}

async function exchangeToken(code, redirectUri) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error('Missing TikTok client credentials');
  }
  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });
  const response = await fetch(`https://open.tiktokapis.com/v2/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || 'TikTok token exchange failed');
  }
  return payload;
}

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      return { statusCode: 400, body: 'Missing code/state' };
    }

    const statePayload = verifyState(state);
    if (!statePayload) {
      return { statusCode: 400, body: 'Invalid state' };
    }

    const { brandId, redirectPath, userId } = statePayload;
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const redirectUri = `${baseUrl}/tiktok/oauth/callback`;

    const tokenResponse = await exchangeToken(code, redirectUri);
    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token || null;
    const expiresIn = tokenResponse.expires_in || null;
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
      : null;
    const openId = tokenResponse.open_id || null;

    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const activeConnections = await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&is_active=eq.true`
    );
    const atLimit = activeConnections.length >= limits.networks;

    await supabaseRequest('network_connections?on_conflict=brand_id,network,account_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: {
        brand_id: brandId,
        user_id: userId || null,
        network: 'tiktok',
        account_id: openId || brandId,
        account_name: openId || 'TikTok',
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scopes: ['video.upload', 'video.publish', 'video.list'],
        meta_user_id: openId,
        is_active: !atLimit,
        updated_at: new Date().toISOString()
      }
    });

    const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/editor.html';
    return {
      statusCode: 302,
      headers: {
        Location: `${safeRedirect}?oauth=${atLimit ? 'limit' : 'success'}&oauth_network=tiktok`
      }
    };
  } catch (error) {
    return {
      statusCode: 302,
      headers: { Location: '/editor.html?oauth=error&oauth_network=tiktok' }
    };
  }
};
