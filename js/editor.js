const editorState = {
  post_master: {
    text: '',
    media: []
  },
  selected_networks: [],
  adaptations: {},
  post_id: null,
  formats: {
    instagram: { feed: true, stories: false },
    facebook: { feed: true, stories: false },
    tiktok: { feed: true, stories: false },
    youtube: { feed: true },
    twitter: { feed: true },
    linkedin: { feed: true }
  },
  status: 'draft',
  publish_mode: 'now',
  scheduled_at: null
};

const postText = document.getElementById('postText');
const mediaInput = document.getElementById('mediaInput');
const emptyState = document.getElementById('emptyState');
const previewText = document.getElementById('previewText');
const previewMedia = document.getElementById('previewMedia');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const clearDraftBtn = document.getElementById('clearDraftBtn');
const draftMessage = document.getElementById('draftMessage');
const statusValue = document.getElementById('statusValue');
const selectionSummary = document.getElementById('selectionSummary');
const mediaCount = document.getElementById('mediaCount');
const networkWarning = document.getElementById('networkWarning');
const adaptationsList = document.getElementById('adaptationsList');
const adaptationsEmpty = document.getElementById('adaptationsEmpty');
const schedulePicker = document.getElementById('schedulePicker');
const scheduleAt = document.getElementById('scheduleAt');
const scheduleTimezone = document.getElementById('scheduleTimezone');
const summaryNetworks = document.getElementById('summaryNetworks');
const summaryFormats = document.getElementById('summaryFormats');
const summarySchedule = document.getElementById('summarySchedule');
const reviewBtn = document.getElementById('reviewBtn');
const validationSummary = document.getElementById('validationSummary');
const validationSuccess = document.getElementById('validationSuccess');
const finalizeBtn = document.getElementById('finalizeBtn');
const globalPublishStatus = document.getElementById('globalPublishStatus');
const networkPublishList = document.getElementById('networkPublishList');
const metricsList = document.getElementById('metricsList');
const brandSelect = document.getElementById('brandSelect');
const brandNameInput = document.getElementById('brandNameInput');
const createBrandBtn = document.getElementById('createBrandBtn');
const activeBrandLabel = document.getElementById('activeBrandLabel');
const brandLimitNote = document.getElementById('brandLimitNote');
const planUsageNote = document.getElementById('planUsageNote');
let activeBrandRole = 'viewer';
let currentPlanLimits = null;
const brandIdInput = document.getElementById('brandIdInput');
const oauthMessage = document.getElementById('oauthMessage');
const loadMetaBtn = document.getElementById('loadMetaBtn');
const facebookAccountSelect = document.getElementById('facebookAccountSelect');
const instagramAccountSelect = document.getElementById('instagramAccountSelect');
const activateFacebookBtn = document.getElementById('activateFacebookBtn');
const activateInstagramBtn = document.getElementById('activateInstagramBtn');

function updateEmptyState() {
  if (!emptyState) {
    return;
  }
  emptyState.style.display = editorState.post_master.text ? 'none' : 'block';
}

function updatePreviewText() {
  if (!previewText) {
    return;
  }
  previewText.textContent = editorState.post_master.text || 'Sin texto todavía.';
}

function updatePreviewMedia() {
  if (!previewMedia) {
    return;
  }
  previewMedia.innerHTML = '';
  if (editorState.post_master.media.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'helper-text';
    empty.textContent = 'Sin media adjunta.';
    previewMedia.appendChild(empty);
    return;
  }

  editorState.post_master.media.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-item';

    const actions = document.createElement('div');
    actions.className = 'preview-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn--ghost btn--small';
    removeBtn.textContent = 'Quitar';
    removeBtn.addEventListener('click', () => {
      removeMediaAt(index);
    });
    actions.appendChild(removeBtn);
    wrapper.appendChild(actions);

    if (item.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = item.previewUrl;
      img.alt = item.name || 'Imagen';
      wrapper.appendChild(img);
      previewMedia.appendChild(wrapper);
      return;
    }
    if (item.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.src = item.previewUrl;
      video.controls = true;
      wrapper.appendChild(video);
      previewMedia.appendChild(wrapper);
    }
  });
}

function updateSummary() {
  if (!selectionSummary) {
    return;
  }
  const networksCount = editorState.selected_networks.length;
  selectionSummary.textContent = `${networksCount} redes seleccionadas`;
}

function updateAdaptationsVisibility() {
  if (!adaptationsEmpty || !adaptationsList) {
    return;
  }
  const hasNetworks = editorState.selected_networks.length > 0;
  adaptationsEmpty.style.display = hasNetworks ? 'none' : 'block';
  adaptationsList.style.display = hasNetworks ? 'grid' : 'none';
}

function updateNetworkWarning() {
  if (!networkWarning) {
    return;
  }
  networkWarning.style.display = editorState.selected_networks.length === 0 ? 'block' : 'none';
}

function updateNetworkStyles() {
  document.querySelectorAll('.network-option').forEach((option) => {
    const key = option.dataset.network;
    if (!key) {
      return;
    }
    option.classList.toggle('is-selected', editorState.selected_networks.includes(key));
    const formatGroup = option.querySelector('.format-group');
    if (formatGroup) {
      formatGroup.classList.toggle('is-disabled', !editorState.selected_networks.includes(key));
    }
  });
}

function updateMediaCount() {
  if (!mediaCount) {
    return;
  }
  mediaCount.textContent = `${editorState.post_master.media.length} adjuntos`;
}

function updateStatus() {
  if (!statusValue) {
    return;
  }
  statusValue.textContent = editorState.status;
}

function setDraftStatus() {
  editorState.status = 'draft';
  updateStatus();
}

function setScheduledStatus() {
  editorState.status = 'scheduled';
  updateStatus();
}

function setDraftMessage(text) {
  if (!draftMessage) {
    return;
  }
  // Solo auto-ocultar confirmaciones rápidas; errores/avisos deben quedarse visibles.
  draftMessage.textContent = text;
}

function revokeMediaUrls(mediaItems) {
  mediaItems.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
}

function removeMediaAt(index) {
  const removed = editorState.post_master.media.splice(index, 1);
  revokeMediaUrls(removed);
  updatePreviewMedia();
  updateMediaCount();
}

function clearDraft() {
  editorState.post_master.text = '';
  revokeMediaUrls(editorState.post_master.media);
  editorState.post_master.media = [];
  editorState.post_id = null;
  if (postText) {
    postText.value = '';
  }
  if (mediaInput) {
    mediaInput.value = '';
  }
  updateEmptyState();
  updatePreviewText();
  updatePreviewMedia();
  updateMediaCount();
  setDraftStatus();
  setDraftMessage('Borrador limpio.');
  setTimeout(() => setDraftMessage(''), 3000);
  if (validationSummary) {
    validationSummary.textContent = '';
  }
  if (validationSuccess) {
    validationSuccess.textContent = '';
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('draft_id');
  window.history.replaceState({}, '', url.toString());
}

function bindEvents() {
  if (postText) {
    postText.addEventListener('input', (event) => {
      editorState.post_master.text = event.target.value;
      updateEmptyState();
      updatePreviewText();
      syncAdaptationsFromMaster();
    });
  }

  if (mediaInput) {
    mediaInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      revokeMediaUrls(editorState.post_master.media);
      editorState.post_master.media = files.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        previewUrl: URL.createObjectURL(file)
      }));
      updatePreviewMedia();
      updateMediaCount();
      validateAndRender();
    });
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', async () => {
      setDraftStatus();
      await saveDraftToBackend();
    });
  }

  if (clearDraftBtn) {
    clearDraftBtn.addEventListener('click', () => {
      clearDraft();
    });
  }

  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      validateAndRender();
    });
  }

  if (finalizeBtn) {
    finalizeBtn.addEventListener('click', () => {
      validateAndRender();
    });
  }

  document.querySelectorAll('.connect-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const network = event.currentTarget.dataset.network;
      startNetworkOAuth(network);
    });
  });

  if (loadMetaBtn) {
    loadMetaBtn.addEventListener('click', () => {
      loadMetaConnections();
    });
  }

  if (activateFacebookBtn) {
    activateFacebookBtn.addEventListener('click', () => {
      activateMetaConnection('facebook', facebookAccountSelect?.value);
    });
  }

  if (activateInstagramBtn) {
    activateInstagramBtn.addEventListener('click', () => {
      activateMetaConnection('instagram', instagramAccountSelect?.value);
    });
  }

  if (createBrandBtn) {
    createBrandBtn.addEventListener('click', () => {
      createBrand();
    });
  }

  if (brandSelect) {
    brandSelect.addEventListener('change', () => {
      setActiveBrand(brandSelect.value);
    });
  }

  document.querySelectorAll('.network-input').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const value = event.target.value;
      if (event.target.checked) {
        if (!editorState.selected_networks.includes(value)) {
          editorState.selected_networks.push(value);
        }
        ensureDefaultFormats(value);
        ensureAdaptation(value);
      } else {
        editorState.selected_networks = editorState.selected_networks.filter((item) => item !== value);
        resetFormatsForNetwork(value);
      }
      updateSummary();
      updateNetworkStyles();
      updateNetworkWarning();
      renderAdaptations();
      updateAdaptationsVisibility();
      updateSummaryDetails();
      validateAndRender();
    });
  });

  document.querySelectorAll('.format-input').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const network = event.target.dataset.network;
      const format = event.target.dataset.format;
      if (!network || !format) {
        return;
      }
      if (!editorState.formats[network]) {
        editorState.formats[network] = {};
      }
      editorState.formats[network][format] = event.target.checked;
      updateSummaryDetails();
      validateAndRender();
    });
  });

  updateNetworkStyles();
  updateNetworkWarning();
  syncFormatInputs();
  updateAdaptationsVisibility();
  renderAdaptations();
  bindScheduling();
  updateSummaryDetails();
  validateAndRender();
}

function initEditor() {
  window.editorState = editorState;
  handleMetaOAuthResult();
  loadBrands();
  loadDraftFromQuery();
  updateEmptyState();
  updatePreviewText();
  updatePreviewMedia();
  updateMediaCount();
  updateSummary();
  updateStatus();
  updateNetworkStyles();
  updateNetworkWarning();
  syncFormatInputs();
  updateAdaptationsVisibility();
  renderAdaptations();
  bindScheduling();
  updateSummaryDetails();
  validateAndRender();
  bindEvents();
}

function getLocalUserId() {
  const storageKey = 'eloria_user_id';
  let value = localStorage.getItem(storageKey);
  if (!value) {
    value = crypto?.randomUUID ? crypto.randomUUID() : `user_${Date.now()}`;
    localStorage.setItem(storageKey, value);
  }
  return value;
}

async function loadBrands() {
  if (!brandSelect) {
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch(`/brands?user_id=${userId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar marcas.');
    }
    currentPlanLimits = data.limits || null;
    renderBrands(data.brands || []);
  } catch (error) {
    setOauthMessage(error.message || 'No se pudieron cargar marcas.');
  }
}

function renderBrands(brands) {
  if (!brandSelect) {
    return;
  }
  brandSelect.innerHTML = '';
  if (!Array.isArray(brands) || brands.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Sin marcas todavía';
    brandSelect.appendChild(option);
    setActiveBrand('');
    return;
  }

  const stored = localStorage.getItem('active_brand_id');
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand.id;
    option.textContent = brand.name;
    option.dataset.role = brand.role || 'viewer';
    if (stored && stored === brand.id) {
      option.selected = true;
    }
    brandSelect.appendChild(option);
  });

  const selectedId = brandSelect.value || brands[0].id;
  setActiveBrand(selectedId);
  updateBrandLimitNote(brands);
}

function updateBrandLimitNote(brands) {
  if (!brandLimitNote) {
    return;
  }
  const count = Array.isArray(brands) ? brands.length : 0;
  const limit = currentPlanLimits?.brands || 1;
  if (count <= limit) {
    brandLimitNote.textContent = `Marcas usadas: ${count}/${limit}`;
    return;
  }
  brandLimitNote.textContent = 'Has superado el límite de marcas.';
}

function setActiveBrand(brandId) {
  if (brandIdInput) {
    brandIdInput.value = brandId || '';
  }
  if (activeBrandLabel) {
    activeBrandLabel.textContent = brandId ? `Marca activa: ${brandSelect?.selectedOptions?.[0]?.textContent}` : 'Sin marca seleccionada.';
  }
  const role = brandSelect?.selectedOptions?.[0]?.dataset?.role || 'viewer';
  activeBrandRole = role;
  applyRolePermissions(role);
  if (brandId) {
    localStorage.setItem('active_brand_id', brandId);
    loadBrandUsage(brandId);
  }
}

function applyRolePermissions(role) {
  const readOnly = role === 'viewer';
  const editableSelectors = [
    '#postText',
    '#mediaInput',
    '#saveDraftBtn',
    '#clearDraftBtn',
    '#reviewBtn',
    '#finalizeBtn',
    '.connect-btn',
    '.network-input',
    '.format-input',
    '.adaptations-list input',
    '.adaptations-list textarea',
    '#loadMetaBtn',
    '#activateFacebookBtn',
    '#activateInstagramBtn',
    '#scheduleAt',
    'input[name="publishMode"]'
  ];
  editableSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el instanceof HTMLButtonElement) {
        el.style.display = readOnly ? 'none' : '';
      } else {
        el.disabled = readOnly;
      }
    });
  });

  if (createBrandBtn) {
    createBrandBtn.style.display = role === 'viewer' ? 'none' : '';
  }
  if (brandNameInput) {
    brandNameInput.disabled = role === 'viewer';
  }
}

async function createBrand() {
  const name = brandNameInput?.value?.trim();
  if (!name) {
    setOauthMessage('Ingresa un nombre de marca.');
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch('/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, user_id: userId })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo crear la marca.');
    }
    brandNameInput.value = '';
    setOauthMessage('Marca creada.');
    await loadBrands();
  } catch (error) {
    setOauthMessage(error.message || 'No se pudo crear la marca.');
  }
}

async function loadBrandUsage(brandId) {
  const userId = getLocalUserId();
  try {
    const response = await fetch(`/brand/usage?brand_id=${brandId}&user_id=${userId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar límites.');
    }
    applyPlanLimits(data);
  } catch (error) {
    setOauthMessage(error.message || 'No se pudo cargar límites.');
  }
}

function applyPlanLimits(data) {
  if (!data || !data.limits) {
    return;
  }
  const { limits, usage } = data;
  if (planUsageNote) {
    planUsageNote.textContent = `Redes activas: ${usage.active_networks}/${limits.networks} · Publicaciones mes: ${usage.monthly_posts}/${limits.monthly_posts}`;
  }

  const atNetworkLimit = usage.active_networks >= limits.networks;
  document.querySelectorAll('.connect-btn').forEach((btn) => {
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = atNetworkLimit;
    }
  });

  if (finalizeBtn instanceof HTMLButtonElement) {
    finalizeBtn.disabled = usage.monthly_posts >= limits.monthly_posts;
  }
}

function startNetworkOAuth(network) {
  if (!network) {
    return;
  }
  if (network === 'facebook' || network === 'instagram') {
    startMetaOAuth();
    return;
  }
  if (network === 'tiktok') {
    startTikTokOAuth();
    return;
  }
  if (network === 'youtube') {
    startYouTubeOAuth();
    return;
  }
  setOauthMessage('Esta red no está disponible para conexión.');
}

function startMetaOAuth() {
  const brandId = brandIdInput?.value?.trim();
  if (!brandId) {
    setOauthMessage('Ingresa el Brand ID para conectar la red.');
    return;
  }
  const userId = getLocalUserId();
  const params = new URLSearchParams({
    brand_id: brandId,
    user_id: userId,
    redirect: '/editor.html'
  });
  window.location.href = `/meta/oauth/start?${params.toString()}`;
}

function startTikTokOAuth() {
  const brandId = brandIdInput?.value?.trim();
  if (!brandId) {
    setOauthMessage('Ingresa el Brand ID para conectar la red.');
    return;
  }
  const userId = getLocalUserId();
  const params = new URLSearchParams({
    brand_id: brandId,
    user_id: userId,
    redirect: '/editor.html'
  });
  window.location.href = `/tiktok/oauth/start?${params.toString()}`;
}

function startYouTubeOAuth() {
  const brandId = brandIdInput?.value?.trim();
  if (!brandId) {
    setOauthMessage('Ingresa el Brand ID para conectar la red.');
    return;
  }
  const userId = getLocalUserId();
  const params = new URLSearchParams({
    brand_id: brandId,
    user_id: userId,
    redirect: '/editor.html'
  });
  window.location.href = `/youtube/oauth/start?${params.toString()}`;
}

function handleMetaOAuthResult() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('oauth');
  if (!status) {
    return;
  }
  const network = params.get('oauth_network');
  if (status === 'success') {
    setOauthMessage('Conexión completada. Puedes continuar.');
    if (!network || network === 'facebook' || network === 'instagram') {
      loadMetaConnections();
    }
    if (network === 'tiktok' || network === 'youtube') {
      updateNetworkStatus(network, true);
    }
    if (brandIdInput?.value) {
      loadBrandUsage(brandIdInput.value);
    }
  } else if (status === 'limit') {
    setOauthMessage('Límite de redes activas alcanzado. Actualiza tu plan.');
    if (network) {
      updateNetworkStatus(network, false);
    }
  } else {
    setOauthMessage('No se pudo completar la conexión. Intenta de nuevo.');
    if (network) {
      updateNetworkStatus(network, false);
    }
  }
}

function setOauthMessage(text) {
  if (!oauthMessage) {
    return;
  }
  oauthMessage.textContent = text;
}

async function loadMetaConnections() {
  const brandId = brandIdInput?.value?.trim();
  if (!brandId) {
    setOauthMessage('Ingresa el Brand ID para cargar cuentas.');
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch(`/meta/connections?brand_id=${brandId}&user_id=${userId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar las cuentas.');
    }
    populateMetaSelects(data.connections || []);
  } catch (error) {
    setOauthMessage(error.message || 'No se pudieron cargar las cuentas.');
  }
}

function populateMetaSelects(connections) {
  if (facebookAccountSelect) {
    facebookAccountSelect.innerHTML = '<option value="">Selecciona una página</option>';
  }
  if (instagramAccountSelect) {
    instagramAccountSelect.innerHTML = '<option value="">Selecciona una cuenta</option>';
  }

  const facebookConnections = connections.filter((item) => item.network === 'facebook');
  const instagramConnections = connections.filter((item) => item.network === 'instagram');

  facebookConnections.forEach((conn) => {
    const option = document.createElement('option');
    option.value = conn.account_id;
    option.textContent = conn.account_name || conn.account_id;
    if (conn.is_active) {
      option.selected = true;
      updateNetworkStatus('facebook', true);
    }
    facebookAccountSelect?.appendChild(option);
  });

  instagramConnections.forEach((conn) => {
    const option = document.createElement('option');
    option.value = conn.account_id;
    option.textContent = conn.account_name || conn.account_id;
    if (conn.is_active) {
      option.selected = true;
      updateNetworkStatus('instagram', true);
    }
    instagramAccountSelect?.appendChild(option);
  });
}

async function activateMetaConnection(network, accountId) {
  const brandId = brandIdInput?.value?.trim();
  if (!brandId || !network || !accountId) {
    setOauthMessage('Selecciona una cuenta antes de activar.');
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch('/meta/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: brandId,
        network,
        account_id: accountId,
        user_id: userId
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo activar la cuenta.');
    }
    setOauthMessage('Cuenta activada.');
    updateNetworkStatus(network, true);
  } catch (error) {
    setOauthMessage(error.message || 'No se pudo activar la cuenta.');
  }
}

function updateNetworkStatus(network, isConnected) {
  const option = document.querySelector(`.network-option[data-network="${network}"] .network-status`);
  if (option) {
    option.textContent = isConnected ? 'Conectada' : 'No conectada';
  }
}

async function saveDraftToBackend() {
  const payloadFinal = buildPayloadFinal();
  const userId = getLocalUserId();
  try {
    const response = await fetch('/posts/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload_final: payloadFinal,
        brand_id: brandIdInput?.value?.trim() || null,
        user_id: userId
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar el borrador.');
    }
    if (data.id) {
      editorState.post_id = data.id;
      const url = new URL(window.location.href);
      url.searchParams.set('draft_id', data.id);
      window.history.replaceState({}, '', url.toString());
    }
    setDraftMessage('Guardado en Borradores');
    setTimeout(() => setDraftMessage(''), 3000);
  } catch (error) {
    setDraftMessage(error.message || 'No se pudo guardar el borrador.');
  }
}

async function loadDraftFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const draftId = params.get('draft_id');
  if (!draftId) {
    return;
  }
  try {
    const response = await fetch(`/posts/${draftId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el borrador.');
    }
    editorState.post_id = data.id || draftId;
    rehydrateEditor(data.payload_final);
    loadPublishStatus(editorState.post_id);
    loadMetrics(editorState.post_id);
  } catch (error) {
    setDraftMessage(error.message || 'No se pudo cargar el borrador.');
  }
}

async function loadPublishStatus(postId) {
  if (!postId) {
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch(`/posts/status/${postId}?user_id=${userId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el estado.');
    }
    renderPublishStatus(data.publish_results || []);
  } catch (error) {
    renderPublishStatus([]);
  }
}

function renderPublishStatus(results) {
  if (!globalPublishStatus || !networkPublishList) {
    return;
  }

  const networks = editorState.selected_networks || [];
  if (networks.length === 0) {
    setGlobalPublishStatus('pending', 'Pendiente');
    networkPublishList.innerHTML = '';
    return;
  }

  const perNetwork = networks.map((network) => {
    const entries = results.filter((item) => item.network === network);
    if (entries.length === 0) {
      return { network, status: 'pending', error: '' };
    }
    const failed = entries.find((item) => item.status === 'failed');
    if (failed) {
      return { network, status: 'failed', error: failed.error_message || '' };
    }
    return { network, status: 'success', error: '' };
  });

  const successCount = perNetwork.filter((item) => item.status === 'success').length;
  const failedCount = perNetwork.filter((item) => item.status === 'failed').length;
  const total = perNetwork.length;

  if (successCount === total) {
    setGlobalPublishStatus('success', 'Publicado');
  } else if (failedCount === total) {
    setGlobalPublishStatus('failed', 'Fallido');
  } else {
    setGlobalPublishStatus('partial', 'Parcial');
  }

  networkPublishList.innerHTML = '';
  perNetwork.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'status-item';

    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = `<span>${labelForNetwork(item.network)}</span>`;

    const badge = document.createElement('span');
    badge.className = `status-badge ${statusClassFor(item.status)}`;
    badge.textContent = statusLabelFor(item.status);
    row.appendChild(badge);

    wrapper.appendChild(row);

    if (item.status === 'failed' && item.error) {
      const errorText = document.createElement('div');
      errorText.className = 'status-error';
      errorText.textContent = item.error;
      wrapper.appendChild(errorText);
    }

    networkPublishList.appendChild(wrapper);
  });
}

function setGlobalPublishStatus(status, text) {
  globalPublishStatus.className = `status-badge ${statusClassFor(status)}`;
  globalPublishStatus.textContent = text;
}

function statusClassFor(status) {
  if (status === 'success') {
    return 'is-success';
  }
  if (status === 'failed') {
    return 'is-failed';
  }
  if (status === 'partial') {
    return 'is-partial';
  }
  return 'is-pending';
}

function statusLabelFor(status) {
  if (status === 'success') {
    return 'Éxito';
  }
  if (status === 'failed') {
    return 'Fallido';
  }
  return 'Pendiente';
}

async function loadMetrics(postId) {
  if (!postId || !metricsList) {
    return;
  }
  const userId = getLocalUserId();
  try {
    const response = await fetch(`/posts/metrics/${postId}?user_id=${userId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar métricas.');
    }
    renderMetrics(data.metrics || []);
  } catch (error) {
    renderMetrics([]);
  }
}

function renderMetrics(metrics) {
  if (!metricsList) {
    return;
  }
  if (!Array.isArray(metrics) || metrics.length === 0) {
    metricsList.innerHTML = '<p class="helper-text">Sin métricas todavía.</p>';
    return;
  }
  metricsList.innerHTML = '';
  metrics.forEach((item) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'metrics-item';

    const title = document.createElement('div');
    title.textContent = labelForNetwork(item.network);
    wrapper.appendChild(title);

    const followers = document.createElement('div');
    followers.className = 'metrics-row';
    followers.innerHTML = `<span class="metrics-label">Seguidores</span><span>${item.followers_count ?? '—'}</span>`;
    wrapper.appendChild(followers);

    const likes = document.createElement('div');
    likes.className = 'metrics-row';
    likes.innerHTML = `<span class="metrics-label">Likes</span><span>${item.likes_count ?? '—'}</span>`;
    wrapper.appendChild(likes);

    const comments = document.createElement('div');
    comments.className = 'metrics-row';
    comments.innerHTML = `<span class="metrics-label">Comentarios</span><span>${item.comments_count ?? '—'}</span>`;
    wrapper.appendChild(comments);

    metricsList.appendChild(wrapper);
  });
}

function buildPayloadFinal() {
  return {
    post_id: editorState.post_id || null,
    status: editorState.status,
    publish_mode: editorState.publish_mode,
    scheduled_at_utc: editorState.scheduled_at,
    post_master: {
      text: editorState.post_master.text,
      media: editorState.post_master.media
    },
    selected_networks: editorState.selected_networks,
    formats: editorState.formats,
    adaptations: editorState.adaptations,
    validation: editorState.validation || { global: [], per_network: {} },
    metadata: {
      created_at_utc: null,
      updated_at_utc: null,
      editor_version: 'day7',
      source: 'editor'
    }
  };
}

function rehydrateEditor(payload) {
  if (!payload) {
    return;
  }
  editorState.post_master = payload.post_master || { text: '', media: [] };
  editorState.selected_networks = payload.selected_networks || [];
  editorState.formats = payload.formats || editorState.formats;
  editorState.adaptations = payload.adaptations || {};
  editorState.publish_mode = payload.publish_mode || 'now';
  editorState.scheduled_at = payload.scheduled_at_utc || null;
  editorState.status = payload.status || 'draft';
  editorState.validation = payload.validation || { global: [], per_network: {} };

  if (postText) {
    postText.value = editorState.post_master.text || '';
  }
  if (mediaInput) {
    mediaInput.value = '';
  }
  updatePreviewText();
  updatePreviewMedia();
  updateEmptyState();

  document.querySelectorAll('.network-input').forEach((checkbox) => {
    checkbox.checked = editorState.selected_networks.includes(checkbox.value);
  });
  syncFormatInputs();
  updateNetworkStyles();
  updateNetworkWarning();
  updateAdaptationsVisibility();
  renderAdaptations();
  updateSummary();
  updateSummaryDetails();
  updateStatus();

  if (editorState.publish_mode === 'scheduled' && schedulePicker) {
    schedulePicker.classList.add('is-visible');
    if (scheduleAt && editorState.scheduled_at) {
      const localValue = new Date(editorState.scheduled_at);
      scheduleAt.value = localValue.toISOString().slice(0, 16);
    }
  }
}

function ensureDefaultFormats(network) {
  const formats = editorState.formats[network];
  if (!formats) {
    return;
  }
  if (typeof formats.feed === 'boolean') {
    const hasStories = Object.prototype.hasOwnProperty.call(formats, 'stories');
    const noSelection = !formats.feed && (!hasStories || !formats.stories);
    if (noSelection) {
      formats.feed = true;
      if (hasStories) {
        formats.stories = false;
      }
    }
  }
  syncFormatInputs();
}

function resetFormatsForNetwork(network) {
  const formats = editorState.formats[network];
  if (!formats) {
    return;
  }
  Object.keys(formats).forEach((key) => {
    formats[key] = false;
  });
  syncFormatInputs();
}

function syncFormatInputs() {
  document.querySelectorAll('.format-input').forEach((checkbox) => {
    const network = checkbox.dataset.network;
    const format = checkbox.dataset.format;
    if (!network || !format) {
      return;
    }
    const formats = editorState.formats[network];
    checkbox.checked = Boolean(formats?.[format]);
    checkbox.disabled = !editorState.selected_networks.includes(network);
  });
}

function bindScheduling() {
  const radios = document.querySelectorAll('input[name="publishMode"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      editorState.publish_mode = event.target.value;
      if (editorState.publish_mode === 'scheduled') {
        setScheduledStatus();
        if (schedulePicker) {
          schedulePicker.classList.add('is-visible');
        }
      } else {
        setDraftStatus();
        editorState.scheduled_at = null;
        if (scheduleAt) {
          scheduleAt.value = '';
        }
        if (schedulePicker) {
          schedulePicker.classList.remove('is-visible');
        }
      }
      updateSummaryDetails();
      validateAndRender();
    });
  });

  if (scheduleAt) {
    scheduleAt.addEventListener('change', (event) => {
      const value = event.target.value;
      if (!value) {
        editorState.scheduled_at = null;
        updateSummaryDetails();
        validateAndRender();
        return;
      }
      const localDate = new Date(value);
      editorState.scheduled_at = localDate.toISOString();
      updateSummaryDetails();
      validateAndRender();
    });
  }

  if (scheduleTimezone) {
    scheduleTimezone.textContent = 'Se guardará en UTC.';
  }
}

function updateSummaryDetails() {
  if (summaryNetworks) {
    summaryNetworks.textContent = editorState.selected_networks.length
      ? editorState.selected_networks.map(labelForNetwork).join(', ')
      : 'Sin redes seleccionadas.';
  }

  if (summaryFormats) {
    const formatLines = editorState.selected_networks.map((network) => {
      const formats = editorState.formats[network] || {};
      const selected = [];
      if (formats.feed) {
        selected.push('Feed');
      }
      if (formats.stories) {
        selected.push('Stories');
      }
      const label = labelForNetwork(network);
      return `${label}: ${selected.length ? selected.join(' + ') : '—'}`;
    });
    summaryFormats.textContent = formatLines.length ? formatLines.join(' · ') : '—';
  }

  if (summarySchedule) {
    if (editorState.publish_mode === 'scheduled') {
      summarySchedule.textContent = editorState.scheduled_at
        ? `Hora local: ${new Date(editorState.scheduled_at).toLocaleString()} (guardado en UTC)`
        : 'Programado (fecha pendiente)';
    } else {
      summarySchedule.textContent = 'Publicar ahora';
    }
  }
}

function ensureAdaptation(network) {
  if (!editorState.adaptations[network]) {
    editorState.adaptations[network] = {
      text: editorState.post_master.text,
      hashtags: '',
      title: '',
      user_modified: false,
      ui_badge_visible: false
    };
  }
}

function syncAdaptationsFromMaster() {
  editorState.selected_networks.forEach((network) => {
    const adaptation = editorState.adaptations[network];
    if (!adaptation || adaptation.user_modified) {
      return;
    }
    adaptation.text = editorState.post_master.text;
    const input = document.querySelector(`textarea[data-network="${network}"]`);
    if (input) {
      input.value = adaptation.text;
    }
  });
}

function markAdaptationCustomized(network) {
  const adaptation = editorState.adaptations[network];
  if (!adaptation) {
    return;
  }
  if (!adaptation.user_modified) {
    adaptation.user_modified = true;
  }
  if (!adaptation.ui_badge_visible) {
    adaptation.ui_badge_visible = true;
  }
  const badge = document.querySelector(`.adaptation-badge[data-network="${network}"]`);
  if (badge) {
    badge.classList.add('is-visible');
  }
}

function renderAdaptations() {
  if (!adaptationsList) {
    return;
  }
  adaptationsList.innerHTML = '';
  editorState.selected_networks.forEach((network) => {
    ensureAdaptation(network);
    const adaptation = editorState.adaptations[network];
    const card = document.createElement('div');
    card.className = 'adaptation-card';

    const header = document.createElement('div');
    header.className = 'adaptation-header';
    const title = document.createElement('p');
    title.className = 'adaptation-title';
    title.textContent = labelForNetwork(network);
    const badge = document.createElement('span');
    badge.className = `adaptation-badge${adaptation.ui_badge_visible ? ' is-visible' : ''}`;
    badge.dataset.network = network;
    badge.textContent = 'Personalizado';
    const status = document.createElement('span');
    status.className = 'adaptation-status';
    header.appendChild(status);
    header.appendChild(title);
    header.appendChild(badge);

    const hint = document.createElement('p');
    hint.className = 'adaptation-hint';
    hint.textContent = getAdaptationHint(network);

    const textLabel = document.createElement('label');
    textLabel.className = 'form-label';
    textLabel.textContent = 'Texto';

    const textArea = document.createElement('textarea');
    textArea.className = 'form-textarea';
    textArea.rows = 4;
    textArea.dataset.network = network;
    textArea.value = adaptation.text || '';
    textArea.addEventListener('input', (event) => {
      adaptation.text = event.target.value;
      markAdaptationCustomized(network);
      validateAndRender();
    });

    if (network === 'youtube') {
      const titleLabel = document.createElement('label');
      titleLabel.className = 'form-label';
      titleLabel.textContent = 'Título (requerido para YouTube)';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'form-input';
      titleInput.placeholder = 'Agrega un título';
      titleInput.value = adaptation.title || '';
      titleInput.addEventListener('input', (event) => {
        adaptation.title = event.target.value;
        markAdaptationCustomized(network);
        validateAndRender();
      });

      card.appendChild(titleLabel);
      card.appendChild(titleInput);
    }

    const hashLabel = document.createElement('label');
    hashLabel.className = 'form-label';
    hashLabel.textContent = 'Hashtags';

    const hashInput = document.createElement('input');
    hashInput.type = 'text';
    hashInput.className = 'form-input';
    hashInput.placeholder = '#tema #marca';
    hashInput.value = adaptation.hashtags || '';
    hashInput.addEventListener('input', (event) => {
      adaptation.hashtags = event.target.value;
      markAdaptationCustomized(network);
      validateAndRender();
    });

    card.appendChild(header);
    card.appendChild(hint);
    card.appendChild(textLabel);
    card.appendChild(textArea);
    card.appendChild(hashLabel);
    card.appendChild(hashInput);

    const issues = editorState.validation?.per_network?.[network] || [];
    const hasError = issues.some((item) => item.severity === 'error');
    const hasWarning = issues.some((item) => item.severity === 'warning');
    const statusText = hasError ? 'Bloqueado por errores' : 'Listo';
    status.textContent = statusText;
    status.classList.toggle('is-blocked', hasError);
    status.classList.toggle('is-warning', !hasError && hasWarning);
    if (issues.length) {
      const block = document.createElement('div');
      block.className = `validation-block${hasWarning && !hasError ? ' is-warning' : ''}`;
      block.innerHTML = `<strong>Revisa:</strong>`;
      const list = document.createElement('ul');
      issues.forEach((issue) => {
        const item = document.createElement('li');
        item.textContent = issue.message;
        list.appendChild(item);
      });
      block.appendChild(list);
      card.appendChild(block);
    }

    adaptationsList.appendChild(card);
  });
}

function getAdaptationHint(network) {
  switch (network) {
    case 'instagram':
      return 'Recomendado: 5–8 hashtags.';
    case 'tiktok':
      return 'Recomendado: 3–5 hashtags.';
    case 'linkedin':
      return 'Tono profesional, pocos hashtags.';
    case 'twitter':
      return 'Texto corto + link.';
    default:
      return 'Puedes ajustar el texto y hashtags para esta red.';
  }
}

document.addEventListener('DOMContentLoaded', initEditor);

function validateAndRender() {
  editorState.validation = validateEditor();
  renderValidationSummary();
  renderValidationSuccess();
  renderAdaptations();
}

function validateEditor() {
  const global = [];
  const perNetwork = {};

  if (editorState.selected_networks.length === 0) {
    global.push({ message: 'Selecciona al menos una red para publicar.', severity: 'error' });
  }

  if (editorState.publish_mode === 'scheduled') {
    if (!editorState.scheduled_at) {
      global.push({ message: 'Selecciona fecha y hora para programar.', severity: 'error' });
    } else {
      const scheduledDate = new Date(editorState.scheduled_at);
      if (scheduledDate <= new Date()) {
        global.push({
          message: 'La programación debe ser en una fecha y hora futuras. Ajusta la programación e intenta de nuevo.',
          severity: 'error'
        });
      }
    }
  }

  editorState.selected_networks.forEach((network) => {
    const errors = [];
    const formats = editorState.formats[network] || {};
    const hasStories = Boolean(formats.stories);
    if (hasStories && editorState.post_master.media.length === 0) {
      errors.push({
        message: 'Stories requiere una imagen o un video. Agrega media y vuelve a intentar.',
        severity: 'error'
      });
    }
    if (network === 'youtube') {
      const title = editorState.adaptations[network]?.title?.trim();
      if (!title) {
        errors.push({
          message: 'YouTube requiere un título para publicar este video. Agrega un título y vuelve a intentar.',
          severity: 'error'
        });
      }
    }
    if (errors.length) {
      perNetwork[network] = errors;
    }
  });

  return { global, per_network: perNetwork };
}

function renderValidationSummary() {
  if (!validationSummary) {
    return;
  }
  const validation = editorState.validation || { global: [], per_network: {} };
  if (validation.global.length === 0) {
    validationSummary.textContent = '';
    return;
  }
  const list = validation.global.map((item) => `<li>${item.message}</li>`).join('');
  validationSummary.innerHTML = `<strong>Revisa antes de continuar:</strong><ul>${list}</ul>`;
}

function renderValidationSuccess() {
  if (!validationSuccess) {
    return;
  }
  const validation = editorState.validation || { global: [], per_network: {} };
  const hasErrors = validation.global.some((item) => item.severity === 'error')
    || Object.values(validation.per_network).some((list) => list.some((item) => item.severity === 'error'));
  validationSuccess.textContent = hasErrors ? '' : 'Todo listo para publicar';
}
