const PLAN_LIMITS = {
  free: { brands: 1, networks: 2, monthly_posts: 10 },
  creator: { brands: 3, networks: 5, monthly_posts: 50 },
  business: { brands: 10, networks: 10, monthly_posts: 200 },
  professional: { brands: 25, networks: 20, monthly_posts: 1000 }
};

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

async function ensureRole(brandId, userId) {
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
  return record.role;
}

async function getUserPlan(userId) {
  const [plan] = await supabaseRequest(`user_plans?user_id=eq.${userId}&limit=1`);
  return plan?.plan || 'free';
}

function monthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  return { start, end };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method not allowed' };
    }
    const brandId = event.queryStringParameters?.brand_id;
    const userId = event.queryStringParameters?.user_id;
    if (!brandId || !userId) {
      return { statusCode: 400, body: 'Missing brand_id/user_id' };
    }

    await ensureRole(brandId, userId);
    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const { start, end } = monthRange();

    const [usage] = await supabaseRequest(
      `usage_counters?brand_id=eq.${brandId}&period_start=eq.${start.toISOString().slice(0, 10)}&limit=1`
    );
    const activeConnections = await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&is_active=eq.true`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        plan,
        limits,
        usage: {
          active_networks: activeConnections.length,
          monthly_posts: usage?.posts_published || 0,
          period_start: start.toISOString(),
          period_end: end.toISOString()
        }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
