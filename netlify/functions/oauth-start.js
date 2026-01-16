const crypto = require('crypto');

const NETWORK_CONFIG = {
  instagram: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientIdEnv: 'FB_APP_ID',
    clientSecretEnv: 'FB_APP_SECRET',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts'
    ]
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientIdEnv: 'FB_APP_ID',
    clientSecretEnv: 'FB_APP_SECRET',
    scopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts'
    ]
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    scopes: ['user.info.basic', 'video.publish']
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    clientIdEnv: 'X_CLIENT_ID',
    clientSecretEnv: 'X_CLIENT_SECRET',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    scopes: ['r_liteprofile', 'w_member_social', 'r_emailaddress']
  }
};

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

function createCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}

function createCodeChallenge(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest());
}

exports.handler = async (event) => {
  try {
    const params = new URLSearchParams(event.queryStringParameters || {});
    const network = params.get('network');
    const brandId = params.get('brand_id');
    const redirectPath = params.get('redirect') || '/dashboard.html';

    if (!network || !brandId || !NETWORK_CONFIG[network]) {
      return {
        statusCode: 400,
        body: 'Missing or unsupported network.'
      };
    }

    const config = NETWORK_CONFIG[network];
    const clientId = process.env[config.clientIdEnv];

    if (!clientId) {
      return {
        statusCode: 400,
        body: 'Missing OAuth client ID.'
      };
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'http://localhost:8888';
    const redirectUri = `${baseUrl}/.netlify/functions/oauth-callback`;

    const codeVerifier = ['tiktok', 'twitter'].includes(network) ? createCodeVerifier() : '';
    const statePayload = base64url(
      JSON.stringify({
        network,
        brandId,
        redirectPath,
        codeVerifier
      })
    );
    const state = signState(statePayload);

    const authParams = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      scope: config.scopes.join(' ')
    });

    if (network === 'tiktok') {
      authParams.set('client_key', clientId);
      authParams.set('code_challenge', createCodeChallenge(codeVerifier));
      authParams.set('code_challenge_method', 'S256');
    } else {
      authParams.set('client_id', clientId);
    }

    if (network === 'twitter') {
      authParams.set('code_challenge', createCodeChallenge(codeVerifier));
      authParams.set('code_challenge_method', 'S256');
    }

    if (network === 'youtube') {
      authParams.set('access_type', 'offline');
      authParams.set('prompt', 'consent');
    }

    const authUrl = `${config.authUrl}?${authParams.toString()}`;

    return {
      statusCode: 302,
      headers: {
        Location: authUrl
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: 'OAuth start failed.'
    };
  }
};
const crypto = require('crypto');

const OAUTH_CONFIG = {
  instagram: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    clientIdEnv: 'META_CLIENT_ID',
    scope: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish'
    ]
  },
  facebook: {
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    clientIdEnv: 'META_CLIENT_ID',
    scope: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts'
    ]
  },
  tiktok: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    clientIdEnv: 'TIKTOK_CLIENT_ID',
    scope: ['user.info.basic', 'video.publish', 'video.upload']
  },
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  },
  twitter: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    clientIdEnv: 'X_CLIENT_ID',
    scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    usePkce: true
  },
  linkedin: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    scope: ['r_organization_social', 'w_organization_social', 'r_liteprofile']
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const params = event.queryStringParameters || {};
  const network = params.network;
  const brandId = params.brand_id;
  const userId = params.user_id;
  const redirect = params.redirect || '/dashboard.html';

  if (!network || !brandId || !userId) {
    return { statusCode: 400, body: 'Missing required parameters.' };
  }

  const config = OAUTH_CONFIG[network];
  if (!config) {
    return { statusCode: 400, body: 'Unsupported network.' };
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return { statusCode: 500, body: 'OAuth client not configured.' };
  }

  const origin = getOrigin(event);
  const redirectUri = `${origin}/.netlify/functions/oauth-callback`;
  const stateId = crypto.randomUUID();
  const codeVerifier = config.usePkce ? generateCodeVerifier() : null;
  const codeChallenge = config.usePkce ? generateCodeChallenge(codeVerifier) : null;

  await upsertOauthState({
    id: stateId,
    network,
    brand_id: brandId,
    user_id: userId,
    redirect,
    code_verifier: codeVerifier
  });

  const search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scope.join(' '),
    state: stateId
  });

  if (config.usePkce && codeChallenge) {
    search.set('code_challenge', codeChallenge);
    search.set('code_challenge_method', 'S256');
  }

  return {
    statusCode: 302,
    headers: {
      Location: `${config.authUrl}?${search.toString()}`
    }
  };
};

function getOrigin(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  return `${proto}://${host}`;
}

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString('hex');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function upsertOauthState(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase credentials missing.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/oauth_states`, {
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
    throw new Error(`Supabase insert failed: ${text}`);
  }
}
