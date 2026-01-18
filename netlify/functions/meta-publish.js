const GRAPH_VERSION = 'v18.0';

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

async function postGraph(path, payload, accessToken) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Meta API error');
  }
  return data;
}

async function getGraph(path, accessToken) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Meta API error');
  }
  return data;
}

function buildCaption(adaptation, master) {
  const text = adaptation?.text?.trim() || master.text?.trim() || '';
  const hashtags = adaptation?.hashtags?.trim() || '';
  if (!hashtags) {
    return text;
  }
  return `${text}\n${hashtags}`.trim();
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

async function publishFacebookFeed(connection, caption, mediaItem) {
  if (mediaItem) {
    if (mediaItem.type.startsWith('video/')) {
      const payload = {
        file_url: mediaItem.url,
        description: caption
      };
      return postGraph(`${connection.account_id}/videos`, payload, connection.access_token);
    }
    const payload = {
      url: mediaItem.url,
      caption
    };
    return postGraph(`${connection.account_id}/photos`, payload, connection.access_token);
  }

  const payload = { message: caption };
  return postGraph(`${connection.account_id}/feed`, payload, connection.access_token);
}

async function publishFacebookStory(connection, mediaItem) {
  if (!mediaItem) {
    throw new Error('Facebook Stories requieren media.');
  }
  const payload = mediaItem.type.startsWith('video/')
    ? { video_url: mediaItem.url }
    : { photo_url: mediaItem.url };
  return postGraph(`${connection.account_id}/stories`, payload, connection.access_token);
}

async function publishInstagram(connection, caption, mediaItem, isStory) {
  if (!mediaItem) {
    throw new Error('Instagram requiere media para publicar.');
  }
  const payload = mediaItem.type.startsWith('video/')
    ? { video_url: mediaItem.url, caption }
    : { image_url: mediaItem.url, caption };
  if (isStory) {
    payload.is_stories = true;
  }
  const creation = await postGraph(`${connection.account_id}/media`, payload, connection.access_token);
  return postGraph(
    `${connection.account_id}/media_publish`,
    { creation_id: creation.id },
    connection.access_token
  );
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

async function fetchFacebookMetrics(connection, externalPostId) {
  const postData = await getGraph(
    `${externalPostId}?fields=likes.summary(true),comments.summary(true)`,
    connection.access_token
  );
  const pageData = await getGraph(
    `${connection.account_id}?fields=fan_count`,
    connection.access_token
  );
  return {
    followers_count: pageData.fan_count ?? null,
    likes_count: postData.likes?.summary?.total_count ?? null,
    comments_count: postData.comments?.summary?.total_count ?? null
  };
}

async function fetchInstagramMetrics(connection, externalPostId) {
  const mediaData = await getGraph(
    `${externalPostId}?fields=like_count,comments_count`,
    connection.access_token
  );
  const profileData = await getGraph(
    `${connection.account_id}?fields=followers_count`,
    connection.access_token
  );
  return {
    followers_count: profileData.followers_count ?? null,
    likes_count: mediaData.like_count ?? null,
    comments_count: mediaData.comments_count ?? null
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

    const connections = await supabaseRequest(
      `network_connections?brand_id=eq.${brandId}&network=in.(facebook,instagram)&is_active=eq.true`
    );
    const connectionMap = connections.reduce((acc, item) => {
      acc[item.network] = item;
      return acc;
    }, {});

    const mediaItem = pickMediaItem(payloadFinal.post_master?.media || []);
    const results = [];
    let hasFailure = false;

    for (const network of payloadFinal.selected_networks || []) {
      if (network !== 'facebook' && network !== 'instagram') {
        continue;
      }
      const connection = connectionMap[network];
      const adaptation = payloadFinal.adaptations?.[network];
      const caption = buildCaption(adaptation, payloadFinal.post_master || {});
      const formats = payloadFinal.formats?.[network] || {};

      const targets = [];
      if (formats.feed) {
        targets.push('feed');
      }
      if (formats.stories) {
        targets.push('stories');
      }

      for (const target of targets) {
        try {
          if (!connection) {
            throw new Error('No hay cuenta activa para esta red.');
          }
          let response;
          if (network === 'facebook') {
            response =
              target === 'stories'
                ? await publishFacebookStory(connection, mediaItem)
                : await publishFacebookFeed(connection, caption, mediaItem);
          } else {
            response = await publishInstagram(connection, caption, mediaItem, target === 'stories');
          }
          results.push({
            network,
            publish_type: target,
            status: 'success',
            external_post_id: response?.id || null
          });
          if (response?.id) {
            try {
              const metrics =
                network === 'facebook'
                  ? await fetchFacebookMetrics(connection, response.id)
                  : await fetchInstagramMetrics(connection, response.id);
              await storeMetrics(postId, network, metrics);
            } catch (metricsError) {
              await storeMetrics(postId, network, {
                followers_count: null,
                likes_count: null,
                comments_count: null
              });
            }
          }
        } catch (error) {
          hasFailure = true;
          results.push({
            network,
            publish_type: target,
            status: 'failed',
            error_message: error.message
          });
        }
      }
    }

    const now = new Date().toISOString();
    await supabaseRequest(`post_payloads?id=eq.${postId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        status: hasFailure ? 'failed' : 'published',
        publish_results: results,
        published_at: hasFailure ? null : now,
        updated_at: now
      }
    });
    if (!hasFailure) {
      await incrementUsage(brandId);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: !hasFailure, results })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
