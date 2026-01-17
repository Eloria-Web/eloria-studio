const TIKTOK_TIMEOUT_MS = 10000;

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

function monthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  return { start, end };
}

async function incrementUsage(brandId) {
  const { start, end } = monthRange();
  const periodStart = start.toISOString().slice(0, 10);
  const [existing] = await supabaseRequest(
    `usage_counters?brand_id=eq.${brandId}&period_start=eq.${periodStart}&limit=1`
  );
  const nextCount = (existing?.posts_published || 0) + 1;
  if (existing) {
    await supabaseRequest(`usage_counters?id=eq.${existing.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        posts_published: nextCount,
        updated_at: new Date().toISOString()
      }
    });
  } else {
    await supabaseRequest('usage_counters', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        brand_id: brandId,
        period_start: periodStart,
        period_end: end.toISOString().slice(0, 10),
        posts_published: 1,
        active_networks: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  }
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

function pickMediaItem(media = []) {
  if (!Array.isArray(media) || media.length === 0) {
    return null;
  }
  const item = media[0];
  const url = item.url || item.public_url || item.remote_url || null;
  return url
    ? {
        url,
        type: item.type || ''
      }
    : null;
}

async function postWithTimeout(url, payload, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIKTOK_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.message || 'TikTok API error');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function storeMetrics(postId, network, counts) {
  await supabaseRequest('post_metrics', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      post_id: postId,
      network,
      followers_count: counts.followers_count ?? null,
      likes_count: counts.likes_count ?? null,
      comments_count: counts.comments_count ?? null,
      captured_at: new Date().toISOString()
    }
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const postId = body.post_id;
    if (!postId) {
      return { statusCode: 400, body: 'Missing post_id' };
    }

    const [record] = await supabaseRequest(`post_payloads?id=eq.${postId}&limit=1`);
    if (!record) {
      return { statusCode: 404, body: 'Post not found' };
    }
    if (record.status !== 'ready_to_publish') {
      return { statusCode: 400, body: 'Post not ready to publish' };
    }

    const payloadFinal = record.payload_final;
    const brandId = record.brand_id;
    const userId = record.user_id;
    if (!payloadFinal || !brandId) {
      return { statusCode: 400, body: 'Missing payload or brand_id' };
    }

    if (!userId) {
      return { statusCode: 403, body: 'Missing user_id' };
    }
    await ensureRole(brandId, userId, ['owner', 'editor']);

    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const { start } = monthRange();
    const [usage] = await supabaseRequest(
      `usage_counters?brand_id=eq.${brandId}&period_start=eq.${start.toISOString().slice(0, 10)}&limit=1`
    );
    if ((usage?.posts_published || 0) >= limits.monthly_posts) {
      await supabaseRequest(`post_payloads?id=eq.${postId}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'failed',
          error_reason: 'Límite mensual de publicaciones alcanzado.',
          updated_at: new Date().toISOString()
        }
      });
      return { statusCode: 403, body: 'Monthly limit reached' };
    }

    const [connection] = await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&network=eq.tiktok&is_active=eq.true&limit=1`
    );
    if (!connection) {
      return { statusCode: 400, body: 'No active TikTok connection' };
    }

    const mediaItem = pickMediaItem(payloadFinal.post_master?.media || []);
    if (!mediaItem) {
      return { statusCode: 400, body: 'TikTok requires media' };
    }
    if (!mediaItem.type.startsWith('video/')) {
      return { statusCode: 400, body: 'TikTok supports video only' };
    }

    const adaptation = payloadFinal.adaptations?.tiktok;
    const text = adaptation?.text?.trim() || payloadFinal.post_master?.text || '';
    const hashtags = adaptation?.hashtags?.trim() || '';
    const caption = hashtags ? `${text}\n${hashtags}`.trim() : text;

    const payload = {
      post_info: {
        title: caption,
        video_cover_timestamp_ms: 1000
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: mediaItem.url
      }
    };

    let response;
    try {
      response = await postWithTimeout(
        'https://open.tiktokapis.com/v2/post/publish/',
        payload,
        connection.access_token
      );
    } catch (error) {
      await supabaseRequest(`post_payloads?id=eq.${postId}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'failed',
          error_reason: error.message,
          updated_at: new Date().toISOString()
        }
      });
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const now = new Date().toISOString();
    await supabaseRequest(`post_payloads?id=eq.${postId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        status: 'published',
        publish_results: [
          {
            network: 'tiktok',
            publish_type: 'feed',
            status: 'success',
            external_post_id: response?.data?.publish_id || null
          }
        ],
        published_at: now,
        updated_at: now
      }
    });

    await storeMetrics(postId, 'tiktok', {
      followers_count: null,
      likes_count: null,
      comments_count: null
    });
    await incrementUsage(brandId);

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
