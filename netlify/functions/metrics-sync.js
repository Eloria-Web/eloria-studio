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

async function fetchActiveConnections() {
  return supabaseRequest('network_connections?is_active=eq.true');
}

exports.handler = async () => {
  try {
    const webhookUrl = process.env.N8N_METRICS_WEBHOOK_URL;
    if (!webhookUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing N8N_METRICS_WEBHOOK_URL' })
      };
    }

    const connections = await fetchActiveConnections();

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_at: new Date().toISOString(),
        connections
      })
    });

    if (!response.ok) {
      throw new Error(`n8n metrics webhook failed (${response.status})`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ queued: connections.length })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
exports.handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const metricsUrl = process.env.N8N_METRICS_URL;

    if (!supabaseUrl || !serviceKey || !metricsUrl) {
      return { statusCode: 500, body: 'Missing environment variables.' };
    }

    const connections = await supabaseGet(
      `${supabaseUrl}/rest/v1/network_connections?is_active=eq.true&select=brand_id,network,account_id`,
      serviceKey
    );

    for (const connection of connections) {
      const payload = {
        brand_id: connection.brand_id,
        network: connection.network,
        account_id: connection.account_id
      };

      const response = await fetch(metricsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (!Array.isArray(data.metrics)) {
        continue;
      }

      for (const metric of data.metrics) {
        await insertMetric(serviceKey, supabaseUrl, {
          brand_id: connection.brand_id,
          network: connection.network,
          publish_type: metric.publish_type || null,
          external_post_id: metric.external_post_id,
          followers: metric.followers || null,
          impressions: metric.impressions || null,
          reach: metric.reach || null,
          engagement: metric.engagement || null,
          likes: metric.likes || null,
          comments: metric.comments || null,
          shares: metric.shares || null,
          clicks: metric.clicks || null,
          views: metric.views || null,
          metric_date: metric.metric_date,
          last_updated: metric.last_updated || new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      }
    }

    return { statusCode: 200, body: 'Metrics sync completed.' };
  } catch (error) {
    console.error('Metrics sync error:', error);
    return { statusCode: 500, body: 'Metrics sync failed.' };
  }
};

async function supabaseGet(url, serviceKey) {
  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase fetch failed: ${text}`);
  }

  return response.json();
}

async function insertMetric(serviceKey, supabaseUrl, payload) {
  await fetch(`${supabaseUrl}/rest/v1/metrics`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });
}
