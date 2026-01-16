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

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method not allowed' };
    }

    const payload = JSON.parse(event.body || '{}');
    const {
      post_id: postId,
      adaptation_id: adaptationId,
      status,
      external_post_id: externalPostId,
      external_url: externalUrl,
      error_message: errorMessage,
      error_code: errorCode
    } = payload;

    if (!postId || !adaptationId || !status) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    const now = new Date().toISOString();
    const nextStatus = status === 'success' ? 'published' : 'failed';

    await supabaseRequest(`post_adaptations?id=eq.${adaptationId}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        status: nextStatus,
        published_at: status === 'success' ? now : null,
        last_error: status === 'success' ? null : errorMessage,
        updated_at: now
      }
    });

    await supabaseRequest('publications', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        post_id: postId,
        adaptation_id: adaptationId,
        network: payload.network,
        publish_type: payload.publish_type,
        status: status === 'success' ? 'success' : 'failed',
        external_post_id: externalPostId,
        external_url: externalUrl,
        error_message: errorMessage,
        error_code: errorCode,
        published_at: status === 'success' ? now : null,
        created_at: now
      }
    });

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
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, body: 'Missing environment variables.' };
    }

    const payload = JSON.parse(event.body || '{}');
    const { post_id, adaptation_id, status, external_post_id, external_url, error_message, error_code } = payload;

    if (!post_id || !adaptation_id || !status) {
      return { statusCode: 400, body: 'Missing required fields.' };
    }

    const finalStatus = status === 'success' ? 'published' : 'failed';
    await updateAdaptation(serviceKey, supabaseUrl, adaptation_id, {
      status: finalStatus,
      last_error: error_message || null,
      published_at: status === 'success' ? new Date().toISOString() : null
    });

    await insertPublication(serviceKey, supabaseUrl, {
      post_id,
      adaptation_id,
      network: payload.network,
      publish_type: payload.publish_type,
      status: status === 'success' ? 'success' : 'failed',
      external_post_id: external_post_id || null,
      external_url: external_url || null,
      error_message: error_message || null,
      error_code: error_code || null,
      published_at: status === 'success' ? new Date().toISOString() : null
    });

    await updatePostStatus(serviceKey, supabaseUrl, post_id);
    await updateScheduleIfFinal(serviceKey, supabaseUrl, post_id);

    return { statusCode: 200, body: 'Callback processed.' };
  } catch (error) {
    console.error('n8n callback error:', error);
    return { statusCode: 500, body: 'Callback failed.' };
  }
};

async function updatePostStatus(serviceKey, supabaseUrl, postId) {
  const adaptations = await supabaseGet(
    `${supabaseUrl}/rest/v1/post_adaptations?post_id=eq.${postId}&select=status`,
    serviceKey
  );

  const statuses = adaptations.map((item) => item.status);
  let postStatus = 'publishing';
  if (statuses.every((status) => status === 'published')) {
    postStatus = 'published';
  } else if (statuses.some((status) => status === 'published')) {
    postStatus = 'partially_published';
  } else if (statuses.every((status) => status === 'failed')) {
    postStatus = 'failed';
  }

  await fetch(`${supabaseUrl}/rest/v1/posts?id=eq.${postId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: postStatus, updated_at: new Date().toISOString() })
  });
}

async function updateScheduleIfFinal(serviceKey, supabaseUrl, postId) {
  const adaptations = await supabaseGet(
    `${supabaseUrl}/rest/v1/post_adaptations?post_id=eq.${postId}&select=status`,
    serviceKey
  );

  const isFinal = adaptations.every((item) => item.status === 'published' || item.status === 'failed');
  if (!isFinal) {
    return;
  }

  await fetch(`${supabaseUrl}/rest/v1/schedules?post_id=eq.${postId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      is_published: true,
      published_at: new Date().toISOString()
    })
  });
}

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

async function updateAdaptation(serviceKey, supabaseUrl, id, payload) {
  await fetch(`${supabaseUrl}/rest/v1/post_adaptations?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function insertPublication(serviceKey, supabaseUrl, payload) {
  await fetch(`${supabaseUrl}/rest/v1/publications`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
