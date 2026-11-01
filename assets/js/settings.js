import { escapeHtml } from './utils.js';
import { resetReportingState } from './reporting.js';

export const THEMES = {
  meadow: 'Meadow',
  ocean: 'Ocean',
  plum: 'Plum',
  sunset: 'Sunset',
  lavender: 'Lavender',
  midnight: 'Midnight'
};

const PETS = {
  none: { label: 'None' },
  cat: { label: 'Cat', src: 'assets/media/cat.gif' },
  cat2: { label: 'Cat 2', src: 'assets/media/cat2.gif' },
  frog: { label: 'Frog', src: 'assets/media/frog.gif' },
  bmo: { label: 'BMO', src: 'assets/media/bmo.gif' }
};

// --- Storage meter helpers ---
const STORAGE_LIMIT = 5 * 1024 * 1024;   // ~5 MB, the usual localStorage limit (counted in characters)

const storageUsed = () => {
  let chars = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    chars += key.length + (localStorage.getItem(key) || '').length;
  }
  return chars;
};

const formatSize = n => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

const idb = () => new Promise((res, rej) => {
  const req = indexedDB.open('workspaceDB', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('files');
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});
const idbRun = async (mode, fn) => {
  const db = await idb();
  return new Promise((res, rej) => {
    const req = fn(db.transaction('files', mode).objectStore('files'));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
};
const idbGet = key => idbRun('readonly', s => s.get(key));
const idbSet = (key, val) => idbRun('readwrite', s => s.put(val, key));
const idbDel = key => idbRun('readwrite', s => s.delete(key));

// --- Pet ---
let petUrl;
export async function applyPet() {
  const img = document.getElementById('sidebarPet');
  if (!img) return;
  const pet = localStorage.getItem('workspacePet') || 'none';
  let src = PETS[pet]?.src;
  if (pet === 'custom') {
    try {
      const blob = await idbGet('workspacePetCustom');
      if (blob) {
        if (petUrl) URL.revokeObjectURL(petUrl);
        src = petUrl = URL.createObjectURL(blob);
      }
    } catch { }
  }
  if (src) { img.src = src; img.hidden = false; }
  else { img.removeAttribute('src'); img.hidden = true; }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = THEMES[theme] ? theme : 'meadow';
}

export function renderSettings(state, updateBrand) {
  const theme = localStorage.getItem('workspaceTheme') || 'meadow';
  const choices = Object.entries(THEMES).map(([key, label]) => `
      <label class="theme-option ${key === theme ? 'selected' : ''}">
        <input type="radio" name="theme" value="${key}" ${key === theme ? 'checked' : ''}>
        <span class="theme-swatch theme-${key}" aria-hidden="true"></span><span>${label}</span>
      </label>`).join('');

  const pet = localStorage.getItem('workspacePet') || 'none';
  const petOption = (key, label, extra = '') => `
      <label class="theme-option ${key === pet ? 'selected' : ''}" ${extra}>
        <input type="radio" name="pet" value="${key}" ${key === pet ? 'checked' : ''}>
        <span>${label}</span>
      </label>`;
  const petChoices = Object.entries(PETS).map(([key, p]) => petOption(key, p.label)).join('')
    + petOption('custom', 'Custom', 'id="customPetOption" hidden');

  return `
      <section class="panel settings-panel mb-3">
        <div class="d-flex align-items-center gap-3"><div class="blank-icon mb-0"><i class="bi bi-person-gear"></i></div><div><h2 class="panel-title">Workspace settings</h2><div class="panel-subtitle">Personalize your workspace.</div></div></div>
        <form class="mt-2" id="settingsForm" >
              <label class="form-label" for="displayName">Your Bitrix name</label>
              <input class="form-control mb-3" id="displayName" maxlength="50" value="${escapeHtml(state.name)}" placeholder="Enter your name">
              <fieldset class="mb-4"><legend class="form-label mb-2">Color theme</legend><div class="theme-grid">${choices}</div></fieldset>
              <fieldset><legend class="form-label mb-2">Pets</legend><div class="theme-grid" id="petGrid">${petChoices}</div><label class="btn btn-sm helper-btn mt-3 w-100 py-2" for="petUpload"><i class="bi bi-upload me-1"></i>Upload your own pet</label><input type="file" id="petUpload" accept="image/*" hidden><div class="small text-secondary mt-2 text-center" id="petMessage" role="status">Any image. GIFs stay animated.</div></fieldset>
          </section>
          <section class="panel settings-panel">
              <fieldset class="email-template-settings mb-4"><legend class="form-label mb-2">Email details</legend><p class="panel-subtitle mb-3">Use <code>{company}</code> to insert the company name in Webmail.</p><label class="form-label" for="subjectTemplate">Subject Template</label><input class="form-control mb-3" id="subjectTemplate" maxlength="200" value="${escapeHtml(state.emailTemplates.subject)}" placeholder="Enter subject template"><label class="form-label" for="bodyTemplate">Body Template</label><textarea class="form-control" id="bodyTemplate" rows="7" placeholder="Enter body template">${escapeHtml(state.emailTemplates.body)}</textarea></fieldset>
              <button class="copy-btn w-100" type="submit"><i class="bi bi-check2 me-1"></i>Save changes</button>
              <span class="small text-secondary d-block mt-2" id="settingsMessage" role="status"></span>
          </section>
        </form>

      <section class="panel danger-zone mt-3">
        <div class="danger-head text-center">
          <div class="danger-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
          <div>
            <h2 class="panel-title danger-title">Danger zone</h2>
            <div class="panel-subtitle">This will clear all your profile information, webmail templates, personal details, and uploaded profile image. Use this only if you want to start fresh. This action cannot be undone</div>
          </div>
        </div>
        <button type="button" class="reset-btn w-100 mt-2" id="resetAllBtn"><i class="bi bi-arrow-counterclockwise me-2"></i>Reset entire workspace</button>
      </section>

      <div class="reset-modal" id="resetModal" hidden role="dialog" aria-modal="true" aria-labelledby="resetModalTitle">
        <div class="reset-modal-card">
          <div class="reset-modal-icon"><i class="bi bi-exclamation-octagon-fill"></i></div>
          <h3 id="resetModalTitle">Reset everything?</h3>
          <p>This will permanently delete all your settings and reporting data. <strong>This cannot be undone.</strong></p>
          <div class="reset-modal-actions">
            <button type="button" class="btn btn-light" id="resetCancelBtn">Cancel</button>
            <button type="button" class="reset-btn" id="resetConfirmBtn">Yes, reset everything</button>
          </div>
        </div>
      </div>`;
}

export function bindSettings(state, updateBrand) {
  const input = document.getElementById('displayName');
  const subjectTemplate = document.getElementById('subjectTemplate');
  const bodyTemplate = document.getElementById('bodyTemplate');


  // --- Theme ---
  document.querySelectorAll('input[name="theme"]').forEach(choice => choice.addEventListener('change', () => {
    applyTheme(choice.value);
    document.querySelectorAll('.theme-grid .theme-option').forEach(option => option.classList.toggle('selected', option.querySelector('input').checked));
    localStorage.setItem('workspaceTheme', choice.value);
  }));

  // --- Pets ---
  const petMessage = document.getElementById('petMessage');
  const markSelected = () => document.querySelectorAll('#petGrid .theme-option')
    .forEach(o => o.classList.toggle('selected', o.querySelector('input').checked));

  document.querySelectorAll('input[name="pet"]').forEach(choice => choice.addEventListener('change', () => {
    localStorage.setItem('workspacePet', choice.value);
    markSelected();
    applyPet();
  }));

  let thumbUrl;
  const showCustom = async () => {
    try {
      const blob = await idbGet('workspacePetCustom');
      if (blob) document.getElementById('customPetOption').hidden = false;
    } catch { }
  };
  showCustom();

  document.getElementById('petUpload').addEventListener('change', async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { petMessage.textContent = 'Please choose an image file.'; return; }
    try {
      await idbSet('workspacePetCustom', file);
      localStorage.setItem('workspacePet', 'custom');
    } catch { petMessage.textContent = 'Could not save the image. Your browser may be blocking storage.'; return; }
    await showCustom();
    document.querySelector('input[name="pet"][value="custom"]').checked = true;
    markSelected();
    applyPet();
    petMessage.textContent = 'Pet uploaded.';
  });

  // --- Save form ---
  document.getElementById('settingsForm').addEventListener('submit', event => {
    event.preventDefault();
    state.name = input.value.trim() || 'User';
    state.emailTemplates = { subject: subjectTemplate.value, body: bodyTemplate.value };
    localStorage.setItem('workspaceName', state.name);
    localStorage.setItem('emailTemplates', JSON.stringify(state.emailTemplates));
    updateBrand();
    document.getElementById('settingsMessage').textContent = 'Saved successfully.';
  });

  // --- Reset modal ---
  const modal = document.getElementById('resetModal');
  const confirmBtn = document.getElementById('resetConfirmBtn');

  const openModal = () => { modal.hidden = false; };
  const closeModal = () => { modal.hidden = true; };

  document.getElementById('resetAllBtn').addEventListener('click', openModal);
  document.getElementById('resetCancelBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

  const onKey = event => {
    if (!document.body.contains(modal)) { document.removeEventListener('keydown', onKey); return; }
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  };
  document.addEventListener('keydown', onKey);

  confirmBtn.addEventListener('click', async () => {
    ['workspaceName', 'workspaceTheme', 'emailTemplates', 'webmailCompany',
      'workspacePet', 'workspacePetCustom',
      'helperGrid', 'helperGridHistory', 'emailReportV2', 'emailReport', 'webmailProgress']
      .forEach(key => localStorage.removeItem(key));
    try { await idbDel('workspacePetCustom'); } catch { }

    state.name = 'User';
    state.emailTemplates = { subject: '', body: '' };
    state.webmailCompany = '';
    resetReportingState(state);

    applyTheme('meadow');
    applyPet();
    updateBrand();

    document.getElementById('pageContent').innerHTML = renderSettings(state);
    bindSettings(state, updateBrand);
    document.getElementById('settingsMessage').textContent = 'Everything has been reset.';
  });
}