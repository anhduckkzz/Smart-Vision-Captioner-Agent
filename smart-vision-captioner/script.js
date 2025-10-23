// Smart Vision Captioner Agent - frontend logic
// Handles sample selection, API interactions, key persistence, and UI updates.

(() => {
  const hfKeyInput = document.getElementById('hf-key');
  const orKeyInput = document.getElementById('or-key');
  const blipModelSelect = document.getElementById('blip-model');
  const orModelSelect = document.getElementById('or-model');
  const promptTextarea = document.getElementById('prompt');
  const fileInput = document.getElementById('file-input');
  const analyzeButton = document.getElementById('analyze');
  const clearButton = document.getElementById('clear');
  const samplesContainer = document.getElementById('samples');
  const previewContainer = document.getElementById('preview');
  const statusEl = document.getElementById('status');
  const captionOutput = document.getElementById('caption-output');
  const insightOutput = document.getElementById('insight-output');

  const sampleDefinitions = [
    {
      label: 'Burnt PCB',
      path: 'samples/burnt_pcb.jpg',
      alt: 'Sample of a burnt circuit board'
    },
    {
      label: 'Lab Equipment',
      path: 'samples/lab_equipment.jpg',
      alt: 'Sample of laboratory equipment'
    },
    {
      label: 'Classroom',
      path: 'samples/classroom.jpg',
      alt: 'Sample of a classroom environment'
    }
  ];

  const samplePlaceholderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0f172a" />
          <stop offset="1" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="320" height="220" rx="18" fill="url(#g)" stroke="#38bdf8" stroke-dasharray="10 10" stroke-opacity="0.4" />
      <path d="M96 156h128l-36-44-44 52-24-28-24 20z" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.45" />
      <circle cx="206" cy="92" r="22" fill="#0f172a" stroke="#38bdf8" stroke-opacity="0.45" />
      <text x="160" y="116" text-anchor="middle" font-family="Space Grotesk, Arial, sans-serif" font-size="14" fill="#7dd3fc" fill-opacity="0.75">Add sample JPG</text>
    </svg>
  `;
  const samplePlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(samplePlaceholderSvg.trim())}`;
  const sampleButtonMeta = new Map();

  const storageKeys = {
    hf: 'svc:hfKey',
    or: 'svc:orKey',
    blip: 'svc:blipModel',
    orModel: 'svc:orModel'
  };

  /**
   * Track the currently selected image for preview and API calls.
   * @type {{blob: Blob|null, name: string, url: string|null}}
   */
  let currentImage = {
    blob: null,
    name: '',
    url: null
  };

  const setStatus = (message, tone = 'info') => {
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  };

  const buildSampleGallery = () => {
    if (!samplesContainer) return;
    samplesContainer.innerHTML = '';
    sampleButtonMeta.clear();

    sampleDefinitions.forEach((sample) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sample';
      button.dataset.sample = sample.path;
      button.dataset.label = sample.label;

      const image = document.createElement('img');
      image.loading = 'lazy';
      image.src = sample.path;
      image.alt = sample.alt;
      image.dataset.fallback = '';

      image.addEventListener('error', () => {
        if (image.dataset.fallback === 'placeholder') return;
        button.dataset.missing = 'true';
        image.dataset.fallback = 'placeholder';
        image.src = samplePlaceholder;
        image.alt = `${sample.label} placeholder. Add ${sample.path} to enable this sample.`;
      });

      image.addEventListener('load', () => {
        if (image.dataset.fallback === 'placeholder') return;
        button.dataset.missing = 'false';
        image.dataset.fallback = '';
        image.alt = sample.alt;
      });

      const label = document.createElement('span');
      label.textContent = sample.label;

      button.append(image, label);
      samplesContainer.append(button);
      sampleButtonMeta.set(sample.path, { button, image, sample });
    });
  };

  buildSampleGallery();

  const loadPersistedSettings = () => {
    try {
      hfKeyInput.value = localStorage.getItem(storageKeys.hf) || '';
      orKeyInput.value = localStorage.getItem(storageKeys.or) || '';
      const savedBlip = localStorage.getItem(storageKeys.blip);
      if (savedBlip) blipModelSelect.value = savedBlip;
      const savedOrModel = localStorage.getItem(storageKeys.orModel);
      if (savedOrModel) orModelSelect.value = savedOrModel;
    } catch (error) {
      console.warn('Local storage not available:', error);
    }
  };

  const persistKey = (key, value) => {
    try {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Unable to persist value', error);
    }
  };

  const revokePreviewUrl = () => {
    if (currentImage.url) {
      URL.revokeObjectURL(currentImage.url);
      currentImage.url = null;
    }
  };

  const updatePreview = (blob, name) => {
    revokePreviewUrl();
    if (!blob) {
      previewContainer.innerHTML = '<p>No image selected yet.</p>';
      currentImage = { blob: null, name: '', url: null };
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    currentImage = { blob, name: name || 'image.jpg', url: objectUrl };
    previewContainer.innerHTML = `<img src="${objectUrl}" alt="Preview of selected image">`;
  };

  const clearSampleSelection = () => {
    if (!samplesContainer) return;
    const selected = samplesContainer.querySelector('.sample.selected');
    if (selected) selected.classList.remove('selected');
  };

  const handleSampleClick = async (button) => {
    const path = button.dataset.sample;
    if (!path) return;

    const isMarkedMissing = button.dataset.missing === 'true';
    setStatus(
      isMarkedMissing ? '🔄 Checking for newly added sample image...' : '📸 Loading sample image...',
      'info'
    );
    clearSampleSelection();
    button.classList.add('selected');
    fileInput.value = '';

    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load sample (${response.status})`);
      }
      const blob = await response.blob();
      updatePreview(blob, path.split('/').pop() || 'sample.jpg');
      setStatus('✅ Sample image ready. Add your keys to analyze.', 'success');
      button.dataset.missing = 'false';

      const meta = sampleButtonMeta.get(path);
      if (meta) {
        meta.button.dataset.missing = 'false';
        if (meta.image.dataset.fallback === 'placeholder') {
          meta.image.dataset.fallback = 'retry';
          meta.image.src = `${path}?cache=${Date.now()}`;
          meta.image.alt = meta.sample.alt;
        }
      }
    } catch (error) {
      console.error(error);
      setStatus(`⚠️ Unable to load sample image. Place a file at ${path}.`, 'error');
      button.dataset.missing = 'true';
      const meta = sampleButtonMeta.get(path);
      if (meta && meta.image.dataset.fallback !== 'placeholder') {
        meta.image.dataset.fallback = 'placeholder';
        meta.image.src = samplePlaceholder;
        meta.image.alt = `${meta.sample.label} placeholder. Add ${path} to enable this sample.`;
      }
      clearSampleSelection();
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      updatePreview(null, '');
      return;
    }

    clearSampleSelection();
    updatePreview(file, file.name);
    setStatus('📂 Custom image ready. Provide keys to continue.', 'info');
  };

  const validateInputs = () => {
    if (!hfKeyInput.value.trim()) {
      throw new Error('Please enter your Hugging Face token.');
    }
    if (!orKeyInput.value.trim()) {
      throw new Error('Please enter your OpenRouter API key.');
    }
    if (!currentImage.blob) {
      throw new Error('Choose a sample image or upload your own before analyzing.');
    }
  };

  const generateCaption = async (hfKey, model, imageBlob, fileName) => {
    const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
    const formData = new FormData();
    formData.append('inputs', imageBlob, fileName || 'image.jpg');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Hugging Face error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      return data[0].generated_text;
    }

    if (data.error) {
      throw new Error(`Hugging Face error: ${data.error}`);
    }

    throw new Error('Unexpected response from Hugging Face API.');
  };

  const generateInsight = async (orKey, model, prompt, caption) => {
    const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const payload = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are SmartVisionAgent, a precise and concise assistant for turning raw image captions into practical insights.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nRaw caption: "${caption}"`
        }
      ],
      temperature: 0.4,
      max_tokens: 200
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${orKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Smart Vision Captioner Agent'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    if (!message) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return message.trim();
  };

  const runAnalysis = async () => {
    try {
      analyzeButton.disabled = true;
      setStatus('🔐 Validating inputs...', 'info');
      validateInputs();

      const hfKey = hfKeyInput.value.trim();
      const orKey = orKeyInput.value.trim();
      const blipModel = blipModelSelect.value;
      const orModel = orModelSelect.value;
      const prompt = promptTextarea.value.trim();

      persistKey(storageKeys.hf, hfKey);
      persistKey(storageKeys.or, orKey);
      persistKey(storageKeys.blip, blipModel);
      persistKey(storageKeys.orModel, orModel);

      setStatus('🖼️ Generating caption with BLIP...', 'info');
      captionOutput.textContent = 'Generating caption...';
      insightOutput.textContent = 'Awaiting caption result...';

      const caption = await generateCaption(hfKey, blipModel, currentImage.blob, currentImage.name);
      captionOutput.textContent = caption;

      setStatus('🤖 Requesting OpenRouter insight...', 'info');
      insightOutput.textContent = 'Thinking...';

      const insight = await generateInsight(orKey, orModel, prompt, caption);
      insightOutput.textContent = insight;
      setStatus('✅ Caption & insight ready.', 'success');
    } catch (error) {
      console.error(error);
      setStatus(`❌ ${error.message}`, 'error');
      if (!captionOutput.textContent || captionOutput.textContent === 'Generating caption...') {
        captionOutput.textContent = 'No caption available.';
      }
      if (!insightOutput.textContent || insightOutput.textContent === 'Awaiting caption result...' || insightOutput.textContent === 'Thinking...') {
        insightOutput.textContent = 'No insight generated.';
      }
    } finally {
      analyzeButton.disabled = false;
    }
  };

  const handleClear = () => {
    revokePreviewUrl();
    currentImage = { blob: null, name: '', url: null };
    previewContainer.innerHTML = '<p>No image selected yet.</p>';
    fileInput.value = '';
    clearSampleSelection();
    captionOutput.textContent = 'Awaiting analysis...';
    insightOutput.textContent = 'Your insight will appear here.';
    setStatus('✨ Cleared. Ready for a new image.', 'info');
  };

  // Event listeners
  if (samplesContainer) {
    samplesContainer.addEventListener('click', (event) => {
      const button = event.target.closest('.sample');
      if (button) {
        handleSampleClick(button);
      }
    });
  }

  fileInput.addEventListener('change', handleFileSelection);
  analyzeButton.addEventListener('click', (event) => {
    event.preventDefault();
    runAnalysis();
  });
  clearButton.addEventListener('click', (event) => {
    event.preventDefault();
    handleClear();
  });

  [
    [hfKeyInput, storageKeys.hf],
    [orKeyInput, storageKeys.or]
  ].forEach(([input, key]) => {
    input.addEventListener('input', (event) => {
      persistKey(key, event.target.value.trim());
    });
  });

  blipModelSelect.addEventListener('change', (event) => {
    persistKey(storageKeys.blip, event.target.value);
  });

  orModelSelect.addEventListener('change', (event) => {
    persistKey(storageKeys.orModel, event.target.value);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    // Refresh the preview to ensure revoked URLs are recreated when returning to the tab.
    if (currentImage.blob && !currentImage.url) {
      updatePreview(currentImage.blob, currentImage.name);
    }
  });

  loadPersistedSettings();
})();
