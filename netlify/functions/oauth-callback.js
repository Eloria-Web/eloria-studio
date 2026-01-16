const crypto = require('crypto');

const NETWORK_CONFIG = {
  instagram: {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnv: 'FB_APP_ID',
    clientSecretEnv: 'FB_APP_SECRET'
  },
  facebook: {
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    clientIdEnv: 'FB_APP_ID',
    clientSecretEnv: 'FB_APP_SECRET'
  },
  tiktok: {
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET'
  },
  youtube: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET'
  },
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET'
  },
  linkedin: {
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET'
  }
};

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

async function exchangeToken(network, code, redirectUri, codeVerifier) {
  const config = NETWORK_CONFIG[network];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });

  if (network === 'tiktok') {
    body.set('client_key', clientId);
    body.set('client_secret', clientSecret);
    body.set('code_verifier', codeVerifier);
  } else if (network === 'twitter') {
    body.set('client_id', clientId);
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }
    body.set('code_verifier', codeVerifier);
  } else {
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || 'Token exchange failed');
  }
  return payload;
}

async function fetchProfile(network, accessToken) {
  switch (network) {
    case 'facebook':
      return fetchJson(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`);
    case 'instagram':
      return fetchJson(`https://graph.facebook.com/me?fields=id,name&access_token=${accessToken}`);
    case 'tiktok':
      return fetchJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username', accessToken);
    case 'twitter':
      return fetchJson('https://api.twitter.com/2/users/me', accessToken);
    case 'linkedin':
      return fetchJson('https://api.linkedin.com/v2/userinfo', accessToken);
    case 'youtube':
      return fetchJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', accessToken);
    default:
      return null;
  }
}

async function fetchJson(url, accessToken) {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'Profile fetch failed');
  }
  return payload;
}

function extractAccount(profile, tokenPayload) {
  if (!profile) {
    return {
      accountId: tokenPayload.user_id || tokenPayload.open_id || `unknown-${Date.now()}`,
      accountName: 'Unknown'
    };
  }

  if (profile.id) {
    return { accountId: profile.id, accountName: profile.name || profile.username || 'Unknown' };
  }

  if (profile.data && profile.data.id) {
    return { accountId: profile.data.id, accountName: profile.data.name || 'Unknown' };
  }

  if (profile.data && profile.data.length && profile.data[0]?.id) {
    const first = profile.data[0];
    return { accountId: first.id, accountName: first.snippet?.title || 'Unknown' };
  }

  if (profile.sub) {
    return { accountId: profile.sub, accountName: profile.name || 'Unknown' };
  }

  if (profile.data?.user?.open_id) {
    return {
      accountId: profile.data.user.open_id,
      accountName: profile.data.user.display_name || profile.data.user.username || 'Unknown'
    };
  }

  return {
    accountId: tokenPayload.user_id || tokenPayload.open_id || `unknown-${Date.now()}`,
    accountName: 'Unknown'
  };
}

async function upsertConnection({ brandId, network, accessToken, refreshToken, expiresIn, accountId, accountName }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase service credentials');
  }

  const tokenExpiresAt = expiresIn
    ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
    : null;

  const response = await fetch(`${supabaseUrl}/rest/v1/network_connections?on_conflict=brand_id,network,account_id`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      brand_id: brandId,
      network,
      account_id: accountId,
      account_name: accountName,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Failed to save connection');
  }
}

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      return { statusCode: 400, body: 'Missing code/state.' };
    }

    const statePayload = verifyState(state);
    if (!statePayload) {
      return { statusCode: 400, body: 'Invalid state.' };
    }

    const { network, brandId, redirectPath, codeVerifier } = statePayload;
    if (!NETWORK_CONFIG[network]) {
      return { statusCode: 400, body: 'Unsupported network.' };
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const redirectUri = `${baseUrl}/.netlify/functions/oauth-callback`;

    const tokenPayload = await exchangeToken(network, code, redirectUri, codeVerifier);
    const accessToken = tokenPayload.access_token;
    const refreshToken = tokenPayload.refresh_token || tokenPayload.refreshToken;
    const expiresIn = tokenPayload.expires_in;

    const profile = await fetchProfile(network, accessToken).catch(() => null);
    const account = extractAccount(profile, tokenPayload);

    await upsertConnection({
      brandId,
      network,
      accessToken,
      refreshToken,
      expiresIn,
      accountId: account.accountId,
      accountName: account.accountName
    });

    const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/dashboard.html';
    const redirectUrl = `${safeRedirect}?oauth=success&network=${network}`;
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      }
    };
  } catch (error) {
    const redirectUrl = '/dashboard.html?oauth=error';
    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl
      }
    };
  }
};
const OAUTH_CONFIG = {
  instagram: {
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientIdEnv: 'META_CLIENT_ID',
    clientSecretEnv: 'META_CLIENT_SECRET'
  },
  facebook: {
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    clientIdEnv: 'META_CLIENT_ID',
    clientSecretEnv: 'META_CLIENT_SECRET'
  },
  tiktok: {
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_ID',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET'
  },
  youtube: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET'
  },
  twitter: {
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    usePkce: true
  },
  linkedin: {
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET'
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const params = event.queryStringParameters || {};
  const code = params.code;
  const state = params.state;
  const error = params.error;

  if (error) {
    return { statusCode: 400, body: `OAuth error: ${error}` };
  }

  if (!code || !state) {
    return { statusCode: 400, body: 'Missing code or state.' };
  }

  const stateRow = await getOauthState(state);
  if (!stateRow) {
    return { statusCode: 400, body: 'Invalid OAuth state.' };
  }

  const isValidBrand = await validateBrandOwner(stateRow.brand_id, stateRow.user_id);
  if (!isValidBrand) {
    return { statusCode: 403, body: 'Invalid brand ownership.' };
  }

  const config = OAUTH_CONFIG[stateRow.network];
  if (!config) {
    return { statusCode: 400, body: 'Unsupported network.' };
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    return { statusCode: 500, body: 'OAuth client not configured.' };
  }

  const origin = getOrigin(event);
  const redirectUri = `${origin}/.netlify/functions/oauth-callback`;
  const token = await exchangeToken({
    tokenUrl: config.tokenUrl,
    clientId,
    clientSecret,
    code,
    redirectUri,
    codeVerifier: stateRow.code_verifier,
    network: stateRow.network
  });

  const accountInfo = await resolveAccountInfo(stateRow.network, token);

  await saveConnection({
    brand_id: stateRow.brand_id,
    network: stateRow.network,
    account_id: accountInfo.account_id || 'unknown',
    account_name: accountInfo.account_name || stateRow.network,
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    token_expires_at: token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null,
    is_active: true,
    updated_at: new Date().toISOString()
  });

  await deleteOauthState(state);

  return {
    statusCode: 302,
    headers: {
      Location: stateRow.redirect || '/dashboard.html'
    }
  };
};

function getOrigin(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  return `${proto}://${host}`;
}

async function exchangeToken({ tokenUrl, clientId, clientSecret, code, redirectUri, codeVerifier, network }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri
  });

  if (network === 'tiktok') {
    body.set('client_key', clientId);
    body.set('client_secret', clientSecret);
  }

  if (codeVerifier) {
    body.set('code_verifier', codeVerifier);
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  return normalizeTokenResponse(data, network);
}

function normalizeTokenResponse(data, network) {
  if (network === 'tiktok') {
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      open_id: data.open_id
    };
  }
  return data;
}

async function resolveAccountInfo(network, token) {
  try {
    if (network === 'youtube') {
      const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const data = await res.json();
      const channel = data.items?.[0];
      return {
        account_id: channel?.id,
        account_name: channel?.snippet?.title
      };
    }

    if (network === 'twitter') {
      const res = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const data = await res.json();
      return {
        account_id: data.data?.id,
        account_name: data.data?.name
      };
    }

    if (network === 'linkedin') {
      const res = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      const data = await res.json();
      return {
        account_id: data.id,
        account_name: data.localizedFirstName
      };
    }
  } catch (error) {
    console.error('Account lookup failed:', error);
  }

  return { account_id: token.open_id || token.user_id || 'unknown', account_name: network };
}

async function getOauthState(stateId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${supabaseUrl}/rest/v1/oauth_states?id=eq.${stateId}&select=*`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data[0];
}

async function validateBrandOwner(brandId, userId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&user_id=eq.${userId}&select=id`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  return data.length > 0;
}

async function saveConnection(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${supabaseUrl}/rest/v1/network_connections`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save connection: ${text}`);
  }
}

async function deleteOauthState(stateId) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(`${supabaseUrl}/rest/v1/oauth_states?id=eq.${stateId}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
}
