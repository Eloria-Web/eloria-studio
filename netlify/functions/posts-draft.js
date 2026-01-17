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
    const payloadFinal = body.payload_final || body;
    if (!payloadFinal || !payloadFinal.post_master) {
      return { statusCode: 400, body: 'Missing payload_final' };
    }

    const status = payloadFinal.status || 'draft';
    const scheduledAt = payloadFinal.scheduled_at_utc || null;
    const brandId = body.brand_id || null;
    const userId = body.user_id || null;
    if (!brandId || !userId) {
      return { statusCode: 400, body: 'Missing brand_id/user_id' };
    }

    await ensureRole(brandId, userId, ['owner', 'editor']);

    const [record] = await supabaseRequest('post_payloads', {
      method: 'POST',
      body: {
        status,
        scheduled_at_utc: scheduledAt,
        payload_final: payloadFinal,
        brand_id: brandId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: record?.id || null,
        payload_final: record?.payload_final || payloadFinal
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
