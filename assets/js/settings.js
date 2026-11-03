import { escapeHtml } from './utils.js';
import { resetReportingState } from './reporting.js';

export const THEMES = {
  meadow: 'Meadow',
  ocean: 'Ocean',
  plum: 'Plum',
  sunset: 'Sunset',
  sakura: 'Sakura',
  lavender: 'Lavender',
  midnight: 'Midnight'
};

const RANDOM_DIR = 'assets/media/random/';
const RANDOM_PETS = ['cat2.gif', 'cat3.gif', 'gojo.gif', 'rick.gif', 'toothless.gif'];

const PETS = {
  none: { label: 'None' },
  cat: { label: 'Cat', src: 'assets/media/cat.gif' },
  frog: { label: 'Frog', src: 'assets/media/frog.gif' },
  bmo: { label: 'BMO', src: 'assets/media/bmo.gif' },
  random: { label: 'Random Brainrot' }
};

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

let petUrl;
const loadBag = () => { try { return JSON.parse(localStorage.getItem('petBag')) || []; } catch { return []; } };
let bag = loadBag();

const pickRandomPet = () => {
  const last = localStorage.getItem('workspacePetRandom');
  if (!bag.length) {
    bag = RANDOM_PETS.map(f => RANDOM_DIR + f);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    if (bag.length > 1 && bag.at(-1) === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  }
  const pick = bag.pop();
  localStorage.setItem('petBag', JSON.stringify(bag));
  localStorage.setItem('workspacePetRandom', pick);
  return pick;
};

export async function applyPet() {
  const img = document.getElementById('sidebarPet');
  if (!img) return;
  const pet = localStorage.getItem('workspacePet') || 'none';
  let src = PETS[pet]?.src;

  if (pet === 'random') {
    src = localStorage.getItem('workspacePetRandom');
    if (!src || !RANDOM_PETS.map(f => RANDOM_DIR + f).includes(src)) src = pickRandomPet();
  } else if (pet === 'custom') {
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

// --- Custom theme ---
const CUSTOM_KEY = 'workspaceThemeCustom';
const CUSTOM_DEFAULT = { bg: '#f3e4ca', main: '#214638', accent: '#f3bd87', side: '' };   // side '' = same as main
const CUSTOM_VARS = ['--cream', '--paper', '--paper-2', '--green', '--green-2', '--sage', '--orange', '--ink', '--muted', '--line', '--side', '--side-ink'];

const loadCustomTheme = () => {
  try { return { ...CUSTOM_DEFAULT, ...JSON.parse(localStorage.getItem(CUSTOM_KEY)) }; }
  catch { return { ...CUSTOM_DEFAULT }; }
};

const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join('');
};
const isDark = h => { const [r, g, b] = hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) < 128; };

const lum = h => {
  const [r, g, b] = hexToRgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

// darkens (light themes) or lightens (dark themes) the main color until it is readable on the background
const readable = (main, bg) => {
  const target = isDark(bg) ? '#ffffff' : '#000000';
  let c = main;
  for (let i = 0; i < 20 && contrast(c, bg) < 4.5; i++) c = mix(c, target, .1);
  return c;
};

function customPalette(c) {
  const { bg, accent } = c;
  const main = readable(c.main, bg);
  const pal = isDark(bg) ? {
    '--cream': bg, '--paper': mix(bg, '#ffffff', .06), '--paper-2': mix(bg, '#ffffff', .12),
    '--green': main, '--green-2': mix(main, '#ffffff', .3), '--sage': mix(bg, main, .4), '--orange': accent,
    '--ink': mix(bg, '#ffffff', .92), '--muted': mix(bg, '#ffffff', .65), '--line': mix(bg, '#ffffff', .2)
  } : {
    '--cream': bg, '--paper': mix(bg, '#ffffff', .65), '--paper-2': mix(bg, '#ffffff', .4),
    '--green': main, '--green-2': mix(main, '#ffffff', .2), '--sage': mix(bg, main, .35), '--orange': accent,
    '--ink': mix(main, '#000000', .45), '--muted': mix(main, bg, .45), '--line': mix(bg, main, .12)
  };
  const side = c.side || main;
  pal['--side'] = side;
  pal['--side-ink'] = isDark(side) ? '#f4f4f4' : mix(side, '#000000', .75);
  return pal;
}

export function applyTheme(theme) {
  const t = theme === 'custom' || THEMES[theme] ? theme : 'meadow';
  const root = document.documentElement;
  root.dataset.theme = t;
  CUSTOM_VARS.forEach(v => root.style.removeProperty(v));
  let dark = t === 'midnight';
  if (t === 'custom') {
    const c = loadCustomTheme();
    dark = isDark(c.bg);
    Object.entries(customPalette(c)).forEach(([k, v]) => root.style.setProperty(k, v));
  }
  root.dataset.mode = dark ? 'dark' : 'light';
  const color = getComputedStyle(root).getPropertyValue(dark ? '--cream' : '--green').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export function renderSettings(state, updateBrand) {
  const theme = localStorage.getItem('workspaceTheme') || 'meadow';
  const choices = Object.entries(THEMES).map(([key, label]) => `
      <label class="theme-option ${key === theme ? 'selected' : ''}">
        <input type="radio" name="theme" value="${key}" ${key === theme ? 'checked' : ''}>
        <span class="theme-swatch theme-${key}" aria-hidden="true"></span><span>${label}</span>
      </label>`).join('');
  const custom = loadCustomTheme();
  const customOption = `
      <label class="theme-option ${theme === 'custom' ? 'selected' : ''}">
        <input type="radio" name="theme" value="custom" ${theme === 'custom' ? 'checked' : ''}>
        <span class="theme-swatch" id="customSwatch" style="background:linear-gradient(135deg, ${custom.side || custom.main} 50%, ${custom.accent} 50%)" aria-hidden="true"></span><span>Custom</span>
      </label>`;

  const pet = localStorage.getItem('workspacePet') || 'none';
  const petOption = (key, label, extra = '') => `
      <label class="theme-option ${key === pet ? 'selected' : ''}" ${extra}>
        <input type="radio" name="pet" value="${key}" ${key === pet ? 'checked' : ''}>
        <span>${label}</span>
      </label>`;
  const petChoices = Object.entries(PETS).map(([key, p]) => petOption(key, p.label)).join('')
    + petOption('custom', 'Custom', 'id="customPetOption" hidden');

  return `
      <form class="mt-2" id="settingsForm" >
        <section class="panel settings-panel mb-3">
          <div class="d-flex align-items-center gap-3 mb-2"><div class="blank-icon mb-0"><i class="bi bi-person-gear"></i></div><div><h2 class="panel-title">Workspace settings</h2><div class="panel-subtitle">Personalize your workspace.</div></div></div>
          <label class="form-label" for="displayName">Your Bitrix name</label>
          <input class="form-control mb-3" id="displayName" maxlength="50" value="${escapeHtml(state.name)}" placeholder="Enter your name">
          <fieldset class="mb-4"><legend class="form-label mb-2">Color theme</legend>
            <div class="theme-grid">${choices}${customOption}</div>
            <div class="row g-3 mt-1" id="customThemeBox" ${theme === 'custom' ? '' : 'hidden'}>
              <div class="col-12 d-flex align-items-center justify-content-end gap-2">
                <span class="small text-secondary text-end">Need help picking colors?</span>
                <button type="button" class="btn btn-sm helper-btn rounded-circle" id="colorHelpBtn" style="width:1.75rem;height:1.75rem;padding:0;line-height:1" aria-label="Get color ideas from AI" title="Get color ideas from AI">?</button>
              </div>
              ${[['bg', 'Background'], ['side', 'Sidebar'], ['main', 'Main color'], ['accent', 'Accent']].map(([key, label]) => `
                <div class="col-6 col-md-3">
                  <label class="form-label small" for="custom_${key}">${label}</label>
                  <input type="color" class="form-control form-control-color w-100" id="custom_${key}" data-custom="${key}" value="${custom[key] || custom.main}">
                </div>`).join('')}
            </div>
          </fieldset>
          <fieldset><legend class="form-label mb-2">Pets</legend><div class="theme-grid pet-grid" id="petGrid">${petChoices}</div><label class="btn btn-sm helper-btn mt-3 w-100 py-2" for="petUpload"><i class="bi bi-upload me-1"></i>Upload your own pet</label><input type="file" id="petUpload" accept="image/*" hidden><div class="small text-secondary mt-2 text-center" id="petMessage" role="status">Any image. GIFs stay animated.</div></fieldset>
        </section>
        <section class="panel settings-panel mb-3">
            <fieldset class="email-template-settings"><legend class="form-label mb-2">Email details</legend><p class="panel-subtitle mb-3">Use <code>{company}</code> to insert the company name in Webmail.</p><label class="form-label" for="subjectTemplate">Subject Template</label><input class="form-control mb-3" id="subjectTemplate" maxlength="200" value="${escapeHtml(state.emailTemplates.subject)}" placeholder="Enter subject template"><label class="form-label" for="bodyTemplate">Body Template</label><textarea class="form-control" id="bodyTemplate" rows="7" placeholder="Enter body template">${escapeHtml(state.emailTemplates.body)}</textarea></fieldset>
        </section>

        <section class="panel settings-panel">
            <fieldset class="email-template-settings"><legend class="form-label mb-2">Personal details</legend>
              <p class="panel-subtitle mb-3">These details will also appear in Webmail.</p>
              <div class="row g-3">
              ${[
      ['userName', 'fullName', 'Full Name', 'Enter your full name'],
      ['userCompanyName', 'company', 'Company Name', 'Enter your company name'],
      ['userAddress', 'address', 'Address', 'Enter your address'],
      ['userContact', 'contact', 'Contact', 'Enter your contact number'],
      ['userEmailAddress', 'email', 'Email Address', 'Enter your email address'],
      ['userWebsite', 'website', 'Website', 'Enter your website']
    ].map(([id, key, label, hint]) => `
                <div class="col-12 col-md-6">
                  <label class="form-label" for="${id}">${label}</label>
                  <input class="form-control" id="${id}" data-personal="${key}" maxlength="200" value="${escapeHtml((state.personal || {})[key] || '')}" placeholder="${hint}">
                </div>`).join('')}
              </div>
            </fieldset>
            <button class="copy-btn w-100 mt-4" type="submit"><i class="bi bi-check2 me-1"></i>Save changes</button>
            <span class="small text-secondary d-block mt-2" id="settingsMessage" role="status"></span>
        </section>
      </form>

      <section class="panel danger-zone mt-3">
        <div class="danger-head text-center">
          <div class="danger-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
          <div>
            <h2 class="panel-title danger-title">Danger zone</h2>
            <div class="panel-subtitle">This will clear all your personal workspace settings. Use this only if you want to start fresh. This action cannot be undone</div>
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
      </div>
      
      <div class="modal" id="colorHelpModal" tabindex="-1" aria-labelledby="colorHelpTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="colorHelpTitle">Customize colors</h5>
              <button type="button" class="btn-close js-color-help-close" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="small text-secondary">Describe the colors you like, copy the prompt, and paste it into ChatGPT or another AI. Then enter the four HEX colors it gives you in the Custom theme pickers.</p>
              <label class="form-label" for="colorPrefInput">Color preference</label>
              <input class="form-control" id="colorPrefInput" maxlength="200" placeholder="e.g. sage green and cream" autocomplete="off">
              <div class="small text-secondary mt-2" id="colorPromptMessage" role="status"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light js-color-help-close">Close</button>
              <button type="button" class="copy-btn" id="copyColorPromptBtn"><i class="bi bi-clipboard me-1"></i>Copy prompt</button>
            </div>
          </div>
        </div>
      </div>`;
}

export function bindSettings(state, updateBrand) {
  const input = document.getElementById('displayName');
  const subjectTemplate = document.getElementById('subjectTemplate');
  const bodyTemplate = document.getElementById('bodyTemplate');

  const settingsMessage = document.getElementById('settingsMessage');
  let messageTimer;
  const flash = (text, ms = 3000) => {
    clearTimeout(messageTimer);
    settingsMessage.textContent = text;
    messageTimer = setTimeout(() => { settingsMessage.textContent = ''; }, ms);
  };

  // --- Theme ---
  const customBox = document.getElementById('customThemeBox');
  document.querySelectorAll('input[name="theme"]').forEach(choice => choice.addEventListener('change', () => {
    document.getElementById('customThemeBox').hidden = choice.value !== 'custom';
    document.querySelectorAll('input[name="theme"]').forEach(i => i.closest('.theme-option').classList.toggle('selected', i.checked));
    localStorage.setItem('workspaceTheme', choice.value);
    applyTheme(choice.value);
  }));

  document.querySelectorAll('[data-custom]').forEach(picker => picker.addEventListener('input', () => {
    const c = loadCustomTheme();
    c[picker.dataset.custom] = picker.value;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(c));
    localStorage.setItem('workspaceTheme', 'custom');
    applyTheme('custom');
    const swatch = document.getElementById('customSwatch');
    if (swatch) swatch.style.background = `linear-gradient(135deg, ${c.side || c.main} 50%, ${c.accent} 50%)`;
  }));

  // --- Color help modal ---
  const helpModalEl = document.getElementById('colorHelpModal');
  const helpInput = document.getElementById('colorPrefInput');
  const helpMsg = document.getElementById('colorPromptMessage');

  const showHelp = () => {
    helpMsg.textContent = '';
    if (window.bootstrap?.Modal) {
      bootstrap.Modal.getOrCreateInstance(helpModalEl).show();
    } else {
      helpModalEl.style.display = 'block';
      helpModalEl.classList.add('show');
      helpModalEl.removeAttribute('aria-hidden');
      helpModalEl.setAttribute('aria-modal', 'true');
    }
    setTimeout(() => helpInput.focus(), 150);
  };
  const hideHelp = () => {
    if (window.bootstrap?.Modal) {
      bootstrap.Modal.getOrCreateInstance(helpModalEl).hide();
    } else {
      helpModalEl.style.display = 'none';
      helpModalEl.classList.remove('show');
      helpModalEl.setAttribute('aria-hidden', 'true');
      helpModalEl.removeAttribute('aria-modal');
    }
  };

  const buildColorPrompt = pref => [
    `I'm customizing the color theme of a web app. My color preference: ${pref}.`,
    '',
    'Give me exactly four HEX colors, one for each role:',
    '- Background: the page background',
    '- Sidebar: the sidebar background',
    '- Main: the primary color for headings, buttons and links (must be easy to read on the Background)',
    '- Accent: a highlight color for small details',
    '',
    'Reply with only these four lines, in exactly this format and nothing else:',
    'Background: #RRGGBB',
    'Sidebar: #RRGGBB',
    'Main: #RRGGBB',
    'Accent: #RRGGBB',
    '',
    'Use 6-digit HEX codes only (no color names, no shorthand like #fff). Make sure there is good contrast between Main and Background.'
  ].join('\n');

  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch { }
    // fallback for non-HTTPS / blocked clipboard; textarea lives inside the modal so Bootstrap's focus trap doesn't block it
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    helpModalEl.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { }
    ta.remove();
    return ok;
  };

  const copyColorPrompt = async () => {
    const pref = helpInput.value.trim();
    if (!pref) { helpMsg.textContent = 'Enter a color preference first.'; helpInput.focus(); return; }
    helpMsg.textContent = (await copyText(buildColorPrompt(pref)))
      ? 'Prompt copied. Paste it into ChatGPT or another AI.'
      : 'Could not copy automatically. Please try again or use a secure (HTTPS) page.';
  };

  document.getElementById('colorHelpBtn').addEventListener('click', showHelp);
  document.getElementById('copyColorPromptBtn').addEventListener('click', copyColorPrompt);
  helpModalEl.querySelectorAll('.js-color-help-close').forEach(b => b.addEventListener('click', hideHelp));
  helpInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); copyColorPrompt(); } });

  // --- Pets ---
  const petMessage = document.getElementById('petMessage');
  const markSelected = () => document.querySelectorAll('#petGrid .theme-option')
    .forEach(o => o.classList.toggle('selected', o.querySelector('input').checked));

  document.querySelectorAll('input[name="pet"]').forEach(choice => choice.addEventListener('click', () => {
    localStorage.setItem('workspacePet', choice.value);
    if (choice.value === 'random') pickRandomPet();
    markSelected();
    applyPet();
  }));

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
    state.personal = {};
    document.querySelectorAll('[data-personal]').forEach(el => { state.personal[el.dataset.personal] = el.value.trim(); });
    localStorage.setItem('personalDetails', JSON.stringify(state.personal));
    state.name = input.value.trim() || 'User';
    state.emailTemplates = { subject: subjectTemplate.value, body: bodyTemplate.value };
    localStorage.setItem('workspaceName', state.name);
    localStorage.setItem('emailTemplates', JSON.stringify(state.emailTemplates));
    updateBrand();
    flash('Saved successfully.');
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
    ['workspaceName', 'workspaceTheme', 'workspaceThemeCustom', 'emailTemplates', 'webmailCompany',
      'workspacePet', 'workspacePetCustom', 'collectionState', 'petBag', 'workspacePetRandom',
      'helperGrid', 'helperGridHistory', 'emailReportV2', 'emailReport', 'webmailProgress',
      'workspaceLog', 'workspaceQuota', 'personalDetails']
      .forEach(key => localStorage.removeItem(key));
    try { await idbDel('workspacePetCustom'); } catch { }

    state.name = 'User';
    state.emailTemplates = { subject: '', body: '' };
    state.webmailCompany = '';
    state.personal = {};
    resetReportingState(state);

    applyTheme('meadow');
    applyPet();
    updateBrand();

    document.getElementById('pageContent').innerHTML = renderSettings(state);
    bindSettings(state, updateBrand);
  });
}