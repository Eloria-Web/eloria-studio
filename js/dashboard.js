// Dashboard functionality with Supabase
document.addEventListener('DOMContentLoaded', async function() {
  if (!window.supabaseClient) {
    console.error('Supabase not initialized');
    return;
  }

  // Check for payment success message
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    const alert = document.getElementById('paymentSuccessAlert');
    if (alert) {
      alert.style.display = 'block';
      setTimeout(() => {
        alert.style.display = 'none';
      }, 5000);
    }
  }

  // Load user data
  await loadUserData();

  // Initialize product core UI
  initializeProductCore();

  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      await window.supabaseClient.auth.signOut();
      window.location.href = '/';
    });
  }
});

const NETWORKS = [
  { key: 'instagram', label: 'Instagram', formats: ['feed', 'stories'] },
  { key: 'facebook', label: 'Facebook Pages', formats: ['feed', 'stories'] },
  { key: 'tiktok', label: 'TikTok', formats: ['feed', 'stories'] },
  { key: 'youtube', label: 'YouTube', formats: ['shorts', 'long_video'] },
  { key: 'twitter', label: 'X (Twitter)', formats: ['feed'] },
  { key: 'linkedin', label: 'LinkedIn Pages', formats: ['feed'] }
];

const DEFERRED_NETWORKS = [
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'google_business', label: 'Google Business Profile' }
];

async function loadUserData() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('No user found:', userError);
      return;
    }

    window.currentUserId = user.id;
    // Update user info in UI
    const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const userEmail = user.email || '';
    
    document.getElementById('welcomeName').textContent = userName;
    document.getElementById('userName').textContent = userName;
    document.getElementById('userEmail').textContent = userEmail;
    
    // Set avatar initial
    const avatar = document.getElementById('userAvatar');
    if (avatar) {
      avatar.textContent = userName.charAt(0).toUpperCase();
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error getting profile:', profileError);
      // Create profile if it doesn't exist
      const { error: insertError } = await window.supabaseClient
        .from('users')
        .insert({
          id: user.id,
          email: userEmail,
          plan: 'free',
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
      updatePlanDisplay('free', null, null);
    } else if (profile) {
      updatePlanDisplay(profile.plan || 'free', profile.subscription_status, profile.trial_ends_at);
    } else {
      updatePlanDisplay('free', null, null);
    }

  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function updatePlanDisplay(plan, subscriptionStatus, trialEndsAt) {
  const planNames = {
    free: getI18n('plan.free', 'Free'),
    creator: getI18n('plan.creator', 'Creator'),
    business: getI18n('plan.business', 'Business'),
    agency: getI18n('plan.agency', 'Agency')
  };

  const planName = planNames[plan] || getI18n('plan.free', 'Free');
  
  // Update plan badges
  document.getElementById('planName').textContent = `${planName} ${getI18n('plan.suffix', 'Plan')}`;
  document.getElementById('planNameLarge').textContent = planName;

  // Update status
  const statusBadge = document.getElementById('planStatus');
  const planDetails = document.getElementById('planDetails');
  const trialInfo = document.getElementById('trialInfo');
  const upgradeBtn = document.getElementById('upgradeBtn');

  if (subscriptionStatus === 'trialing' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    const daysLeft = Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      statusBadge.innerHTML = `<span class="status-badge status-badge--trial">${getI18n('status.trial', 'Trial')}</span>`;
      planDetails.style.display = 'none';
      trialInfo.style.display = 'block';
      document.getElementById('trialDays').textContent = daysLeft;
    } else {
      statusBadge.innerHTML = `<span class="status-badge status-badge--active">${getI18n('status.active', 'Active')}</span>`;
      planDetails.innerHTML = `<p>${getI18n('status.activeDetail', 'Your subscription is active')}</p>`;
      trialInfo.style.display = 'none';
    }
  } else if (subscriptionStatus === 'active') {
    statusBadge.innerHTML = `<span class="status-badge status-badge--active">${getI18n('status.active', 'Active')}</span>`;
    planDetails.innerHTML = `<p>${getI18n('status.activeDetail', 'Your subscription is active')}</p>`;
    trialInfo.style.display = 'none';
  } else {
    statusBadge.innerHTML = `<span class="status-badge status-badge--inactive">${getI18n('status.inactive', 'Inactive')}</span>`;
    planDetails.innerHTML = `<p>${getI18n('plan.freeDetail', "You're on the free plan")}</p>`;
    trialInfo.style.display = 'none';
  }

  // Show upgrade button for free/creator plans
  if (plan === 'free' || plan === 'creator') {
    upgradeBtn.style.display = 'inline-flex';
  } else {
    upgradeBtn.style.display = 'none';
  }

  // Update plan badge color
  const planBadge = document.getElementById('planBadge');
  planBadge.className = `plan-badge plan-badge--${plan}`;
}

function initializeProductCore() {
  renderNetworkOptions();
  bindComposerActions();
  bindBrandActions();
  loadBrands();
}

function bindBrandActions() {
  const brandForm = document.getElementById('brandForm');
  if (brandForm) {
    brandForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await createBrand();
    });
  }

  const brandSelect = document.getElementById('brandSelect');
  if (brandSelect) {
    brandSelect.addEventListener('change', async () => {
      await loadConnections();
      await loadMetrics();
    });
  }
}

async function loadBrands() {
  const brandSelect = document.getElementById('brandSelect');
  const brandList = document.getElementById('brandList');
  const brandMessage = document.getElementById('brandMessage');

  if (!brandSelect || !brandList) {
    return;
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const { data: brands, error } = await window.supabaseClient
      .from('brands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      setMessage(brandMessage, getI18n('dashboard.msg.brandLoadError', 'Could not load brands.'), 'error');
      return;
    }

    brandSelect.innerHTML = '';
    brandList.innerHTML = '';

    if (!brands || brands.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = getI18n('dashboard.msg.brandFirst', 'Create your first brand');
      brandSelect.appendChild(emptyOption);
      brandList.innerHTML = `<li>${getI18n('dashboard.msg.brandNone', 'No brands yet')}</li>`;
      return;
    }

    brands.forEach((brand, index) => {
      const option = document.createElement('option');
      option.value = brand.id;
      option.textContent = brand.name;
      if (index === 0) {
        option.selected = true;
      }
      brandSelect.appendChild(option);

      const item = document.createElement('li');
      item.textContent = brand.name;
      brandList.appendChild(item);
    });

    await loadConnections();
    await loadMetrics();
  } catch (error) {
    setMessage(brandMessage, getI18n('dashboard.msg.brandLoadError', 'Unable to load brands right now.'), 'error');
  }
}

async function createBrand() {
  const brandInput = document.getElementById('brandName');
  const brandMessage = document.getElementById('brandMessage');

  if (!brandInput) {
    return;
  }

  const name = brandInput.value.trim();
  if (!name) {
    setMessage(brandMessage, getI18n('dashboard.msg.brandNameRequired', 'Brand name is required.'), 'error');
    return;
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const { error } = await window.supabaseClient
      .from('brands')
      .insert({
        user_id: user.id,
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      setMessage(brandMessage, getI18n('dashboard.msg.brandCreateError', 'Could not create brand.'), 'error');
      return;
    }

    brandInput.value = '';
    setMessage(brandMessage, getI18n('dashboard.msg.brandCreated', 'Brand created.'), 'success');
    await loadBrands();
  } catch (error) {
    setMessage(brandMessage, getI18n('dashboard.msg.brandCreateError', 'Could not create brand.'), 'error');
  }
}

function renderNetworkOptions() {
  const container = document.getElementById('networkOptions');
  if (!container) {
    return;
  }

  container.innerHTML = '';
  NETWORKS.forEach((network) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'network-item';
    wrapper.innerHTML = `
      <span>
        <input type="checkbox" data-network="${network.key}">
        ${network.label}
      </span>
      <span class="tag">${getI18n('network.active', 'Active')}</span>
    `;
    container.appendChild(wrapper);
  });

  container.addEventListener('change', () => {
    renderFormatOptions();
    updateAdaptationsPreview();
  });
}

function renderFormatOptions() {
  const container = document.getElementById('formatOptions');
  if (!container) {
    return;
  }

  const selectedNetworks = getSelectedNetworks();
  container.innerHTML = '';

  if (selectedNetworks.length === 0) {
    container.innerHTML = `<p class="helper-text">${getI18n('dashboard.msg.selectNetwork', 'Choose at least one network to select formats.')}</p>`;
    return;
  }

  selectedNetworks.forEach((networkKey) => {
    const network = NETWORKS.find((item) => item.key === networkKey);
    if (!network) {
      return;
    }

    const block = document.createElement('div');
    block.className = 'format-item';
    const options = network.formats.map((format) => {
      return `
        <label>
          <input type="checkbox" data-network="${network.key}" data-format="${format}">
          ${formatLabel(format)}
        </label>
      `;
    }).join('');

    block.innerHTML = `
      <div>
        <strong>${network.label}</strong>
        <div class="format-options">${options}</div>
      </div>
    `;
    container.appendChild(block);
  });

  container.onchange = () => {
    updateAdaptationsPreview();
  };
}

function getSelectedNetworks() {
  const checkboxes = document.querySelectorAll('#networkOptions input[type="checkbox"]');
  return Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.network);
}

function getSelectedFormats() {
  const checkboxes = document.querySelectorAll('#formatOptions input[type="checkbox"]');
  return Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => ({
      network: checkbox.dataset.network,
      format: checkbox.dataset.format
    }));
}

function updateAdaptationsPreview() {
  const tableBody = document.getElementById('adaptationsTable');
  const validationErrors = document.getElementById('validationErrors');

  if (!tableBody) {
    return;
  }

  const selections = getSelectedFormats();
  if (selections.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="empty-state">${getI18n('dashboard.msg.adaptationsEmpty', 'Select networks and formats to preview adaptations.')}</td>
      </tr>
    `;
    if (validationErrors) {
      validationErrors.textContent = '';
    }
    return;
  }

  const validation = validateSelections();
  tableBody.innerHTML = '';
  selections.forEach((selection) => {
    const status = validation.statusMap[`${selection.network}:${selection.format}`] || getI18n('status.draft', 'Draft');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${labelForNetwork(selection.network)}</td>
      <td>${formatLabel(selection.format)}</td>
      <td>${status}</td>
    `;
    tableBody.appendChild(row);
  });

  if (validationErrors) {
    validationErrors.innerHTML = validation.errors.length
      ? `${getI18n('dashboard.msg.validationPrefix', 'Validation')}: ${validation.errors.join(' · ')}`
      : '';
  }
}

function validateSelections() {
  const postText = document.getElementById('postText')?.value?.trim() || '';
  const linkUrl = document.getElementById('linkUrl')?.value?.trim() || '';
  const imageUrls = parseCommaList(document.getElementById('imageUrls')?.value);
  const videoUrl = document.getElementById('videoUrl')?.value?.trim() || '';

  const selections = getSelectedFormats();
  const errors = new Set();
  const statusMap = {};

  selections.forEach((selection) => {
    const result = validateAdaptation({
      network: selection.network,
      format: selection.format,
      postText,
      linkUrl,
      imageUrls,
      videoUrl
    });

    statusMap[`${selection.network}:${selection.format}`] = result.isValid
      ? getI18n('status.draft', 'Draft')
      : getI18n('status.needsReview', 'Needs review');
    result.errors.forEach((error) => errors.add(error));
  });

  return { errors: Array.from(errors), statusMap };
}

function validateAdaptation({ network, format, postText, linkUrl, imageUrls, videoUrl }) {
  const errors = [];

  if (!postText && !imageUrls.length && !videoUrl) {
    errors.push(getI18n('validation.needsTextOrMedia', '{network} {format} needs text or media.', {
      network: labelForNetwork(network),
      format: formatLabel(format)
    }));
  }

  if (format === 'stories' && !imageUrls.length && !videoUrl) {
    errors.push(getI18n('validation.storiesNeedMedia', '{network} Stories require an image or video.', {
      network: labelForNetwork(network)
    }));
  }

  if (network === 'tiktok' && !videoUrl) {
    errors.push(getI18n('validation.tiktokVideo', 'TikTok requires a video URL.'));
  }

  if (network === 'youtube' && !videoUrl) {
    errors.push(getI18n('validation.youtubeVideo', 'YouTube Shorts/Long-form require a video URL.'));
  }

  if (network === 'twitter') {
    if (!postText) {
      errors.push(getI18n('validation.xCopy', 'X requires short copy.'));
    }
    if (postText.length > 280) {
      errors.push(getI18n('validation.xLength', 'X copy must be 280 characters or fewer.'));
    }
  }

  if (network === 'linkedin' && !postText && !linkUrl) {
    errors.push(getI18n('validation.linkedinNeeds', 'LinkedIn Feed needs text or a link.'));
  }

  return { isValid: errors.length === 0, errors };
}

function bindComposerActions() {
  const composerForm = document.getElementById('composerForm');
  const scheduleBtn = document.getElementById('scheduleBtn');

  if (composerForm) {
    composerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      await saveDraft(false);
    });
  }

  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', async () => {
      await saveDraft(true);
    });
  }
}

async function saveDraft(shouldSchedule) {
  const composerMessage = document.getElementById('composerMessage');
  const brandSelect = document.getElementById('brandSelect');

  if (!brandSelect || !brandSelect.value) {
    setMessage(composerMessage, getI18n('dashboard.msg.selectBrand', 'Select a brand before saving.'), 'error');
    return;
  }

  const selectedFormats = getSelectedFormats();
  if (selectedFormats.length === 0) {
    setMessage(composerMessage, getI18n('dashboard.msg.selectFormat', 'Select at least one network format.'), 'error');
    return;
  }

  try {
    const scheduledAtInput = document.getElementById('scheduledAt')?.value;
    if (shouldSchedule && !scheduledAtInput) {
      setMessage(composerMessage, getI18n('dashboard.msg.scheduleDate', 'Add a schedule date before scheduling.'), 'error');
      return;
    }

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const postText = document.getElementById('postText')?.value?.trim() || '';
    const linkUrl = document.getElementById('linkUrl')?.value?.trim() || '';
    const imageUrls = parseCommaList(document.getElementById('imageUrls')?.value);
    const videoUrl = document.getElementById('videoUrl')?.value?.trim() || null;
    const hashtags = parseCommaList(document.getElementById('hashtags')?.value);

    const { data: post, error: postError } = await window.supabaseClient
      .from('posts')
      .insert({
        brand_id: brandSelect.value,
        user_id: user.id,
        content_text: postText,
        image_urls: imageUrls,
        video_url: videoUrl,
        status: shouldSchedule ? 'scheduled' : 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (postError) {
      setMessage(composerMessage, getI18n('dashboard.msg.postSaveError', 'Could not save post.'), 'error');
      return;
    }

    const adaptationsPayload = selectedFormats.map((selection) => {
      const validation = validateAdaptation({
        network: selection.network,
        format: selection.format,
        postText,
        linkUrl,
        imageUrls,
        videoUrl
      });

      return {
        post_id: post.id,
        network: selection.network,
        publish_type: selection.format,
        adapted_text: postText,
        hashtags,
        link_url: linkUrl || null,
        is_valid: validation.isValid,
        validation_errors: validation.errors,
        status: shouldSchedule ? 'scheduled' : 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    const { error: adaptationError } = await window.supabaseClient
      .from('post_adaptations')
      .insert(adaptationsPayload);

    if (adaptationError) {
      setMessage(composerMessage, getI18n('dashboard.msg.adaptationsError', 'Post saved, but adaptations failed.'), 'error');
      return;
    }

    if (shouldSchedule) {
      const scheduledAt = new Date(scheduledAtInput);
      const { error: scheduleError } = await window.supabaseClient
        .from('schedules')
        .insert({
          post_id: post.id,
          scheduled_at: scheduledAt.toISOString(),
          timezone: 'UTC',
          is_published: false,
          created_at: new Date().toISOString()
        });

      if (scheduleError) {
        setMessage(composerMessage, getI18n('dashboard.msg.scheduleError', 'Post saved, but schedule failed.'), 'error');
        return;
      }
    }

    setMessage(composerMessage, shouldSchedule ? getI18n('dashboard.msg.scheduled', 'Scheduled successfully.') : getI18n('dashboard.msg.draftSaved', 'Draft saved.'), 'success');
    updatePublishingStatus(shouldSchedule);
    updateAdaptationsPreview();
  } catch (error) {
    setMessage(composerMessage, getI18n('dashboard.msg.postSaveError', 'Could not save your post.'), 'error');
  }
}

async function loadConnections() {
  const brandSelect = document.getElementById('brandSelect');
  const container = document.getElementById('connectionsList');

  if (!brandSelect || !container || !brandSelect.value) {
    return;
  }

  container.innerHTML = '';

  try {
    const { data: connections, error } = await window.supabaseClient
      .from('network_connections')
      .select('*')
      .eq('brand_id', brandSelect.value)
      .eq('is_active', true);

    if (error) {
      container.innerHTML = `<p class="helper-text">${getI18n('dashboard.msg.connectionsEmpty', 'Connections not available yet.')}</p>`;
      return;
    }

    NETWORKS.forEach((network) => {
      const isConnected = connections?.some((item) => item.network === network.key);
      const item = document.createElement('div');
      item.className = 'connection-item';
      const action = isConnected
        ? `<span class="tag">${getI18n('network.connected', 'Connected')}</span>`
        : `<a class="btn btn--secondary btn--small" href="${getOAuthUrl(network.key)}">${getI18n('network.connect', 'Connect')}</a>`;
      item.innerHTML = `
        <span>${network.label}</span>
        ${action}
      `;
      container.appendChild(item);
    });

    DEFERRED_NETWORKS.forEach((network) => {
      const item = document.createElement('div');
      item.className = 'connection-item';
      item.innerHTML = `
        <span>${network.label}</span>
        <span class="tag tag--soon">${getI18n('network.soon', 'Coming soon')}</span>
      `;
      container.appendChild(item);
    });
  } catch (error) {
    container.innerHTML = `<p class="helper-text">${getI18n('dashboard.msg.connectionsError', 'Unable to load connections.')}</p>`;
  }
}

async function loadMetrics() {
  const brandSelect = document.getElementById('brandSelect');
  const metricsUpdated = document.getElementById('metricsUpdated');
  const metricsGrid = document.getElementById('metricsGrid');

  if (!brandSelect || !brandSelect.value || !metricsGrid) {
    return;
  }

  try {
    const { data: metrics, error } = await window.supabaseClient
      .from('metrics')
      .select('*')
      .eq('brand_id', brandSelect.value)
      .order('metric_date', { ascending: false })
      .limit(200);

    if (error || !metrics || metrics.length === 0) {
      if (metricsUpdated) {
        metricsUpdated.textContent = `${getI18n('dashboard.lastUpdated', 'Last updated')}: —`;
      }
      return;
    }

    const latestDate = metrics[0].metric_date;
    const latestMetrics = metrics.filter((item) => item.metric_date === latestDate);

    const totals = latestMetrics.reduce((acc, item) => {
      acc.followers += item.followers || 0;
      acc.likes += item.likes || 0;
      acc.comments += item.comments || 0;
      acc.views += item.views || 0;
      acc.engagement += item.engagement || 0;
      return acc;
    }, { followers: 0, likes: 0, comments: 0, views: 0, engagement: 0 });

    updateMetricValue(metricsGrid, 'followers', totals.followers);
    updateMetricValue(metricsGrid, 'likes', totals.likes);
    updateMetricValue(metricsGrid, 'comments', totals.comments);
    updateMetricValue(metricsGrid, 'views', totals.views);
    updateMetricValue(metricsGrid, 'engagement', totals.engagement);

    const lastUpdated = latestMetrics.reduce((latest, item) => {
      const candidate = new Date(item.last_updated || item.created_at);
      return candidate > latest ? candidate : latest;
    }, new Date(0));

    if (metricsUpdated) {
      metricsUpdated.textContent = `${getI18n('dashboard.lastUpdated', 'Last updated')}: ${lastUpdated.toLocaleString()}`;
    }
  } catch (error) {
    if (metricsUpdated) {
      metricsUpdated.textContent = `${getI18n('dashboard.lastUpdated', 'Last updated')}: —`;
    }
  }
}

function updateMetricValue(container, key, value) {
  const items = Array.from(container.querySelectorAll('.metric-item'));
  const item = items.find((element) => element.dataset.metricKey === key);
  if (item) {
    const valueEl = item.querySelector('.metric-value');
    if (valueEl) {
      valueEl.textContent = value === 0 ? '0' : value.toLocaleString();
    }
  }
}

function updatePublishingStatus(isScheduled) {
  const statusList = document.getElementById('publishingStatus');
  if (!statusList) {
    return;
  }
  statusList.innerHTML = '';
  const status = document.createElement('li');
  status.className = 'status-item';
  status.textContent = isScheduled
    ? getI18n('status.scheduledWait', 'Scheduled · Waiting for publish')
    : getI18n('status.draftNotScheduled', 'Draft · Not scheduled');
  statusList.appendChild(status);
}

function setMessage(element, text, type) {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.style.color = type === 'error' ? '#9B2C2C' : '#2F855A';
}

function parseCommaList(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function labelForNetwork(networkKey) {
  return NETWORKS.find((network) => network.key === networkKey)?.label || networkKey;
}

function formatLabel(format) {
  switch (format) {
    case 'feed':
      return getI18n('format.feed', 'Feed');
    case 'stories':
      return getI18n('format.stories', 'Stories');
    case 'shorts':
      return getI18n('format.shorts', 'Shorts');
    case 'long_video':
      return getI18n('format.long', 'Long-form');
    default:
      return format;
  }
}

function getOAuthUrl(networkKey) {
  const brandId = document.getElementById('brandSelect')?.value || '';
  const redirect = '/dashboard.html';
  const params = new URLSearchParams({
    network: networkKey,
    brand_id: brandId,
    redirect
  });
  return `/.netlify/functions/oauth-start?${params.toString()}`;
}

function getI18n(key, fallback, tokens = {}) {
  const lang = document.documentElement.lang || 'es';
  const strings = window.I18N_STRINGS?.[lang] || window.I18N_STRINGS?.es;
  let message = strings?.[key] || fallback;
  Object.keys(tokens).forEach((token) => {
    message = message.replace(`{${token}}`, tokens[token]);
  });
  return message;
}
