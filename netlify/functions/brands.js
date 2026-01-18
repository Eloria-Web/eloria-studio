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

exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters?.user_id;
      if (!userId) {
        return { statusCode: 400, body: 'Missing user_id' };
      }
      const memberships = await supabaseRequest(`brand_members?user_id=eq.${userId}`);
      const brandIds = memberships.map((member) => member.brand_id);
      let brands = [];
      let withRoles = [];
      if (brandIds.length > 0) {
        brands = await supabaseRequest(`brands?id=in.(${brandIds.join(',')})&order=created_at.asc`);
        const roleMap = memberships.reduce((acc, member) => {
          acc[member.brand_id] = member.role;
          return acc;
        }, {});
        withRoles = brands.map((brand) => ({
          ...brand,
          role: roleMap[brand.id] || 'viewer'
        }));
      } else {
        brands = await supabaseRequest(`brands?user_id=eq.${userId}&order=created_at.asc`);
        withRoles = brands.map((brand) => ({ ...brand, role: 'owner' }));
      }
      const plan = await getUserPlan(userId);
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      return {
        statusCode: 200,
        body: JSON.stringify({ brands: withRoles, plan, limits })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, user_id: userId } = body;
      if (!name || !userId) {
        return { statusCode: 400, body: 'Missing name/user_id' };
      }

      const plan = await getUserPlan(userId);
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      const existing = await supabaseRequest(`brands?user_id=eq.${userId}`);
      const count = Array.isArray(existing) ? existing.length : 0;
      const isOverLimit = count >= limits.brands;
      if (isOverLimit) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Límite de marcas alcanzado.' })
        };
      }

      const [record] = await supabaseRequest('brands', {
        method: 'POST',
        body: {
          name,
          user_id: userId,
          is_over_limit: isOverLimit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      await supabaseRequest('brand_members', {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          brand_id: record.id,
          user_id: userId,
          role: 'owner',
          created_at: new Date().toISOString()
        }
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ brand: record, is_over_limit: isOverLimit, plan, limits })
      };
    }

    return { statusCode: 405, body: 'Method not allowed' };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
