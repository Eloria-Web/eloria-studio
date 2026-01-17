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

exports.handler = async () => {
  try {
    const now = new Date().toISOString();
    const scheduled = await supabaseRequest(
      `post_payloads?status=eq.scheduled&scheduled_at_utc=lte.${now}&ready_at_utc=is.null`
    );

    for (const record of scheduled) {
      await supabaseRequest(`post_payloads?id=eq.${record.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'ready_to_publish',
          ready_at_utc: now,
          updated_at: now
        }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ transitioned: scheduled.length })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
