const crypto = require('crypto');

const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish'
];

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
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Supabase request failed');
  }

  return response.json().catch(() => ({}));
}

async function ensureRole(brandId, userId, allowedRoles) {
  const records = await supabaseRequest(
    `brand_members?brand_id=eq.${brandId}&user_id=eq.${userId}&limit=1`
  );
  const record = records[0];
  if (!record) {
    const brands = await supabaseRequest(`brands?id=eq.${brandId}&limit=1`);
    const brand = brands[0];
    if (brand?.user_id === userId) {
      return 'owner';
    }
    throw new Error('Forbidden');
  }
  if (!allowedRoles.includes(record.role)) {
    throw new Error('Forbidden');
  }
  return record.role;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signState(payload) {
  const secret = process.env.OAUTH_STATE_SECRET || 'dev-secret';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
}

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const brandId = params.get('brand_id');
    const userId = params.get('user_id');
    const redirectPath = params.get('redirect') || '/editor.html';
    if (!brandId || !userId) {
      return { statusCode: 400, body: 'Missing brand_id/user_id' };
    }

    await ensureRole(brandId, userId, ['owner', 'editor']);

    const clientId = process.env.FB_APP_ID;
    if (!clientId) {
      return { statusCode: 400, body: 'Missing FB_APP_ID' };
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const redirectUri = `${baseUrl}/meta/oauth/callback`;
    const statePayload = base64url(JSON.stringify({ brandId, userId, redirectPath }));
    const state = signState(statePayload);

    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      scope: META_SCOPES.join(',')
    });

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${authParams.toString()}`;
    return {
      statusCode: 302,
      headers: { Location: authUrl }
    };
  } catch (error) {
    return { statusCode: 500, body: 'Meta OAuth start failed' };
  }
};
