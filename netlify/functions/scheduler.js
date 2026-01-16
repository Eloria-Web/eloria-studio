const MAX_RETRIES = 2;
const RETRY_WINDOW_MINUTES = 10;

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

async function fetchDueSchedules() {
  const now = new Date().toISOString();
  return supabaseRequest(`schedules?is_published=eq.false&scheduled_at=lte.${now}`);
}

async function fetchPost(postId) {
  const data = await supabaseRequest(`posts?id=eq.${postId}`);
  return data[0];
}

async function fetchAdaptations(postId) {
  return supabaseRequest(`post_adaptations?post_id=eq.${postId}`);
}

async function fetchConnection(brandId, network) {
  const data = await supabaseRequest(
    `network_connections?brand_id=eq.${brandId}&network=eq.${network}&is_active=eq.true`
  );
  return data[0];
}

async function updateAdaptation(adaptationId, patch) {
  await supabaseRequest(`post_adaptations?id=eq.${adaptationId}`, {
    method: 'PATCH',
    body: patch,
    prefer: 'return=minimal'
  });
}

async function createN8nExecution(payload) {
  await supabaseRequest('n8n_executions', {
    method: 'POST',
    body: payload,
    prefer: 'return=minimal'
  });
}

async function markSchedulePublished(scheduleId) {
  await supabaseRequest(`schedules?id=eq.${scheduleId}`, {
    method: 'PATCH',
    body: {
      is_published: true,
      published_at: new Date().toISOString()
    },
    prefer: 'return=minimal'
  });
}

async function triggerN8n(adaptation, post, connection) {
  const webhookUrl = process.env.N8N_PUBLISH_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('Missing N8N_PUBLISH_WEBHOOK_URL');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_id: post.id,
      adaptation_id: adaptation.id,
      brand_id: post.brand_id,
      network: adaptation.network,
      publish_type: adaptation.publish_type,
      content_text: post.content_text,
      link_url: adaptation.link_url,
      hashtags: adaptation.hashtags,
      image_urls: post.image_urls,
      video_url: post.video_url,
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expires_at: connection.token_expires_at
    })
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed (${response.status})`);
  }
}

async function handleAdaptation(adaptation, post) {
  const now = new Date();
  const lastAttempt = adaptation.last_attempt_at ? new Date(adaptation.last_attempt_at) : null;
  const retryAllowed =
    adaptation.status === 'failed' &&
    adaptation.retry_count < MAX_RETRIES &&
    (!lastAttempt || now - lastAttempt > RETRY_WINDOW_MINUTES * 60 * 1000);

  if (!['scheduled', 'draft'].includes(adaptation.status) && !retryAllowed) {
    return;
  }

  const connection = await fetchConnection(post.brand_id, adaptation.network);
  if (!connection) {
    await updateAdaptation(adaptation.id, {
      status: 'failed',
      retry_count: adaptation.retry_count + 1,
      last_attempt_at: now.toISOString(),
      last_error: 'Network not connected'
    });
    return;
  }

  try {
    await triggerN8n(adaptation, post, connection);
    await createN8nExecution({
      post_id: post.id,
      adaptation_id: adaptation.id,
      n8n_execution_id: `queued-${Date.now()}`,
      status: 'running',
      started_at: now.toISOString()
    });
    await updateAdaptation(adaptation.id, {
      status: 'publishing',
      last_attempt_at: now.toISOString()
    });
  } catch (error) {
    await updateAdaptation(adaptation.id, {
      status: 'failed',
      retry_count: adaptation.retry_count + 1,
      last_attempt_at: now.toISOString(),
      last_error: error.message
    });
  }
}

exports.handler = async () => {
  try {
    const schedules = await fetchDueSchedules();
    for (const schedule of schedules) {
      const post = await fetchPost(schedule.post_id);
      if (!post) {
        await markSchedulePublished(schedule.id);
        continue;
      }
      const adaptations = await fetchAdaptations(post.id);
      for (const adaptation of adaptations) {
        if (!adaptation.should_publish) {
          continue;
        }
        await handleAdaptation(adaptation, post);
      }
      await markSchedulePublished(schedule.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: schedules.length })
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
    const n8nUrl = process.env.N8N_PUBLISH_URL;

    if (!supabaseUrl || !serviceKey || !n8nUrl) {
      return { statusCode: 500, body: 'Missing environment variables.' };
    }

    const now = new Date().toISOString();
    const schedules = await supabaseGet(
      `${supabaseUrl}/rest/v1/schedules?scheduled_at=lte.${now}&is_published=eq.false&select=*`,
      serviceKey
    );

    for (const schedule of schedules) {
      const adaptations = await supabaseGet(
        `${supabaseUrl}/rest/v1/post_adaptations?post_id=eq.${schedule.post_id}&should_publish=eq.true&select=*`,
        serviceKey
      );

      for (const adaptation of adaptations) {
        if (!shouldRetry(adaptation)) {
          continue;
        }

        if (!adaptation.is_valid) {
          await updateAdaptation(serviceKey, supabaseUrl, adaptation.id, {
            status: 'failed',
            last_error: 'Validation failed',
            last_attempt_at: new Date().toISOString(),
            retry_count: adaptation.retry_count
          });
          continue;
        }

        await updateAdaptation(serviceKey, supabaseUrl, adaptation.id, {
          status: 'publishing',
          last_attempt_at: new Date().toISOString(),
          retry_count: adaptation.retry_count + 1
        });

        const publishPayload = {
          post_id: schedule.post_id,
          adaptation_id: adaptation.id,
          network: adaptation.network,
          publish_type: adaptation.publish_type
        };

        await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(publishPayload)
        });

        await insertExecution(serviceKey, supabaseUrl, {
          post_id: schedule.post_id,
          adaptation_id: adaptation.id,
          n8n_execution_id: `${Date.now()}-${adaptation.id}`,
          status: 'running',
          started_at: new Date().toISOString()
        });
      }
    }

    return { statusCode: 200, body: 'Scheduler run completed.' };
  } catch (error) {
    console.error('Scheduler error:', error);
    return { statusCode: 500, body: 'Scheduler failed.' };
  }
};

function shouldRetry(adaptation) {
  if (adaptation.status === 'published') {
    return false;
  }
  if (adaptation.retry_count >= 2 && adaptation.status === 'failed') {
    return false;
  }
  return adaptation.status === 'scheduled' || adaptation.status === 'failed';
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

async function insertExecution(serviceKey, supabaseUrl, payload) {
  await fetch(`${supabaseUrl}/rest/v1/n8n_executions`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
