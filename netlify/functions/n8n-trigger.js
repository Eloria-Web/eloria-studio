const WEBHOOK_TIMEOUT_MS = 7000;

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

async function postWithTimeout(url, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Webhook failed (${response.status})`);
    }
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

exports.handler = async () => {
  try {
    const webhookUrl = process.env.N8N_READY_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('Missing N8N_READY_WEBHOOK_URL');
    }

    const ready = await supabaseRequest(
      `post_payloads?status=eq.ready_to_publish&n8n_triggered_at=is.null`
    );

    for (const record of ready) {
      const payloadFinal = record.payload_final;
      const webhookPayload = {
        post_id: record.id,
        user_id: record.user_id || null,
        brand_id: record.brand_id || null,
        selected_networks: payloadFinal?.selected_networks || [],
        formats: payloadFinal?.formats || {},
        scheduled_at_utc: payloadFinal?.scheduled_at_utc || null,
        publish_mode: payloadFinal?.publish_mode || 'now',
        payload_final: payloadFinal
      };

      let success = false;
      let errorMessage = '';
      try {
        await postWithTimeout(webhookUrl, webhookPayload);
        success = true;
      } catch (error) {
        errorMessage = error.message;
        try {
          await postWithTimeout(webhookUrl, webhookPayload);
          success = true;
        } catch (retryError) {
          errorMessage = retryError.message;
        }
      }

      if (success) {
        await supabaseRequest(`post_payloads?id=eq.${record.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: {
            n8n_triggered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      } else {
        await supabaseRequest(`post_payloads?id=eq.${record.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: {
            status: 'failed',
            error_reason: errorMessage,
            updated_at: new Date().toISOString()
          }
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: ready.length })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
