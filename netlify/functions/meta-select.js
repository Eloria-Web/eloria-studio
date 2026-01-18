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

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }
    const body = JSON.parse(event.body || '{}');
    const { brand_id: brandId, network, account_id: accountId, user_id: userId } = body;
    if (!brandId || !network || !accountId || !userId) {
      return { statusCode: 400, body: 'Missing brand_id/network/account_id/user_id' };
    }

    await ensureRole(brandId, userId, ['owner', 'editor']);

    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const activeConnections = await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&is_active=eq.true`
    );
    const isAlreadyActive = activeConnections.some(
      (item) => item.network === network && item.account_id === accountId
    );
    if (!isAlreadyActive && activeConnections.length >= limits.networks) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Límite de redes activas alcanzado.' }) };
    }

    await supabaseRequest(`network_connections?brand_id=eq.${brandId}&network=eq.${network}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { is_active: false }
    });

    await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&network=eq.${network}&account_id=eq.${accountId}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { is_active: true }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
