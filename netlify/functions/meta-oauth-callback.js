const crypto = require('crypto');

const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish'
];

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

async function exchangeToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    redirect_uri: redirectUri,
    code
  });
  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Token exchange failed');
  }
  return payload;
}

async function exchangeLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    fb_exchange_token: shortToken
  });
  const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params.toString()}`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Long-lived token exchange failed');
  }
  return payload;
}

async function fetchJson(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Meta API error');
  }
  return payload;
}

async function fetchBrandOwner(brandId) {
  const [brand] = await supabaseRequest(`brands?id=eq.${brandId}&limit=1`);
  return brand?.user_id || null;
}

async function upsertConnection(data) {
  await supabaseRequest('network_connections?on_conflict=brand_id,network,account_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: data
  });
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
    const redirectUri = `${baseUrl}/meta/oauth/callback`;

    const tokenResponse = await exchangeToken(code, redirectUri);
    const longTokenResponse = await exchangeLongLivedToken(tokenResponse.access_token);
    const accessToken = longTokenResponse.access_token;
    const expiresIn = longTokenResponse.expires_in;
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
      : null;

    const metaUser = await fetchJson(`https://graph.facebook.com/me?fields=id,name`, accessToken);
    const brandOwnerId = await fetchBrandOwner(brandId);

    const pages = await fetchJson(
      `https://graph.facebook.com/me/accounts?fields=id,name,access_token,instagram_business_account`,
      accessToken
    );

    for (const page of pages.data || []) {
      await upsertConnection({
        brand_id: brandId,
        user_id: userId || brandOwnerId,
        network: 'facebook',
        account_id: page.id,
        account_name: page.name,
        access_token: page.access_token,
        refresh_token: null,
        token_expires_at: tokenExpiresAt,
        scopes: META_SCOPES,
        meta_user_id: metaUser?.id || null,
        is_active: false,
        updated_at: new Date().toISOString()
      });

      if (page.instagram_business_account?.id) {
        const igAccount = await fetchJson(
          `https://graph.facebook.com/${page.instagram_business_account.id}?fields=id,username`,
          accessToken
        );
        await upsertConnection({
          brand_id: brandId,
        user_id: userId || brandOwnerId,
          network: 'instagram',
          account_id: igAccount.id,
          account_name: igAccount.username || igAccount.id,
          access_token: page.access_token,
          refresh_token: null,
          token_expires_at: tokenExpiresAt,
          scopes: META_SCOPES,
          meta_user_id: metaUser?.id || null,
          is_active: false,
          updated_at: new Date().toISOString()
        });
      }
    }

    const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/editor.html';
    return {
      statusCode: 302,
      headers: { Location: `${safeRedirect}?oauth=success&oauth_network=meta` }
    };
  } catch (error) {
    return {
      statusCode: 302,
      headers: { Location: '/editor.html?oauth=error&oauth_network=meta' }
    };
  }
};
