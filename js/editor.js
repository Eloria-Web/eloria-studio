const editorState = {
  post_master: {
    text: '',
    media: []
  },
  selected_networks: [],
  adaptations: {},
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
    saveDraftBtn.addEventListener('click', () => {
      setDraftStatus();
      setDraftMessage('Guardado en Borradores');
      setTimeout(() => setDraftMessage(''), 3000);
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
