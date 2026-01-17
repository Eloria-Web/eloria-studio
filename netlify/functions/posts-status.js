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

function getIdFromPath(path = '') {
  const parts = path.split('/posts/status/');
  if (parts.length < 2) {
    return null;
  }
  return parts[1].split('/')[0] || null;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const queryId = event.queryStringParameters?.id;
    const userId = event.queryStringParameters?.user_id;
    const pathId = getIdFromPath(event.path);
    const id = queryId || pathId;
    if (!id || !userId) {
      return { statusCode: 400, body: 'Missing id/user_id' };
    }

    const records = await supabaseRequest(`post_payloads?id=eq.${id}&limit=1`);
    const record = records[0];
    if (!record) {
      return { statusCode: 404, body: 'Not found' };
    }

    await ensureRole(record.brand_id, userId, ['owner', 'editor', 'viewer']);

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: record.id,
        status: record.status,
        publish_results: record.publish_results || []
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
