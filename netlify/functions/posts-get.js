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

function getIdFromPath(path = '') {
  const parts = path.split('/posts/');
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
    const pathId = getIdFromPath(event.path);
    const id = queryId || pathId;
    if (!id) {
      return { statusCode: 400, body: 'Missing id' };
    }

    const records = await supabaseRequest(`post_payloads?id=eq.${id}&limit=1`);
    const record = records[0];
    if (!record) {
      return { statusCode: 404, body: 'Not found' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: record.id,
        payload_final: record.payload_final
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
