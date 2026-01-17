const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status';

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

async function fetchBinary(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch media');
  }
  return response.arrayBuffer();
}

async function uploadToYoutube(accessToken, mediaItem, title, description) {
  const boundary = `boundary-${Date.now()}`;
  const metadata = {
    snippet: {
      title,
      description
    },
    status: {
      privacyStatus: 'private'
    }
  };

  const mediaBuffer = await fetchBinary(mediaItem.url);
  const metaPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const videoPartHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${mediaItem.type}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const endPart = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([metaPart, videoPartHeader, Buffer.from(mediaBuffer), endPart]);

  const response = await fetch(YOUTUBE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || 'YouTube upload failed');
  }
  return payload;
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

async function fetchYoutubeMetrics(accessToken, videoId, channelId) {
  const statsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const statsPayload = await statsResponse.json();
  if (!statsResponse.ok) {
    throw new Error(statsPayload.error?.message || 'YouTube stats failed');
  }
  const stats = statsPayload.items?.[0]?.statistics || {};

  let followersCount = null;
  if (channelId) {
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelPayload = await channelResponse.json();
    followersCount = channelPayload.items?.[0]?.statistics?.subscriberCount ?? null;
  }

  return {
    followers_count: followersCount,
    likes_count: stats.likeCount ? Number(stats.likeCount) : null,
    comments_count: stats.commentCount ? Number(stats.commentCount) : null
  };
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
      `network_connections?brand_id=eq.${brandId}&network=eq.youtube&is_active=eq.true&limit=1`
    );
    if (!connection) {
      return { statusCode: 400, body: 'No active YouTube connection' };
    }

    const mediaItem = pickMediaItem(payloadFinal.post_master?.media || []);
    if (!mediaItem) {
      return { statusCode: 400, body: 'YouTube requires media' };
    }
    if (!mediaItem.type.startsWith('video/')) {
      return { statusCode: 400, body: 'YouTube supports video only' };
    }

    const adaptation = payloadFinal.adaptations?.youtube;
    const title = adaptation?.title?.trim();
    if (!title) {
      return { statusCode: 400, body: 'YouTube title required' };
    }
    const description = adaptation?.text?.trim() || payloadFinal.post_master?.text || '';

    let response;
    try {
      response = await uploadToYoutube(connection.access_token, mediaItem, title, description);
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
            network: 'youtube',
            publish_type: 'feed',
            status: 'success',
            external_post_id: response?.id || null
          }
        ],
        published_at: now,
        updated_at: now
      }
    });

    try {
      const metrics = await fetchYoutubeMetrics(connection.access_token, response?.id, connection.account_id);
      await storeMetrics(postId, 'youtube', metrics);
    } catch (metricsError) {
      await storeMetrics(postId, 'youtube', {
        followers_count: null,
        likes_count: null,
        comments_count: null
      });
    }
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
