import { escapeHtml } from './utils.js';

const PROGRESS_KEY = 'webmailProgress';
const DEFAULT_PROGRESS = { country1: '', country2: '', segment: '', segment2: '', showSegment2: false };

const loadProgress = () => {
  try { return { ...DEFAULT_PROGRESS, ...JSON.parse(localStorage.getItem(PROGRESS_KEY)) }; }
  catch { return { ...DEFAULT_PROGRESS }; }
};
const saveProgress = p => localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));

const progressText = (state, p) => {
  const country1 = p.country1.trim() || '';
  const country2 = p.country2.trim() || '';
  const segment = p.segment.trim() || '';
  const segment2 = p.showSegment2 ? ` for ${p.segment2.trim() || '{segment2}'}` : '';
  const name = (state.name || '').trim() || 'User';
  return `Hi team, I have finished sending webmails in ${country1} for ${segment}. I will start sending webmails in ${country2}${segment2} now.\n\n- ${name}`;
};

function populate(template, company) {
  return (template || '').replace(/\{company\}/gi, company.trim() || '{company}');
}

export function renderWebmail(state) {
  const company = state.webmailCompany || '';
  const subject = populate(state.emailTemplates.subject, company);
  const body = populate(state.emailTemplates.body, company);
  const p = loadProgress();

  return `
      <section class="panel webmail-panel mb-4">
        <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-globe2" style="color:var(--green)"></i><h2 class="panel-title">Ez Webmail</h2></div>
        <div class="mb-4"><label class="form-label" for="webmailCompany">Company Name</label><input class="form-control" id="webmailCompany" maxlength="120" value="${escapeHtml(company)}" placeholder="Enter company name"></div>
        <div class="mb-2"><div class="d-flex align-items-center justify-content-between gap-3 mb-2"><label class="form-label mb-0" for="webmailSubject">Email Subject</label></div><input class="form-control" id="webmailSubject" readonly value="${escapeHtml(subject)}" placeholder="Set a Subject Template in Settings"></div>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100 mb-4" id="copySubject" aria-label="Copy email subject"><i class="bi bi-copy"></i><span class="ms-1">Copy subject</span></button>
        <div class="mb-2"><label class="form-label" for="webmailBody">Email Body</label><textarea class="form-control webmail-body" id="webmailBody" readonly rows="11" placeholder="Set a Body Template in Settings">${escapeHtml(body)}</textarea></div>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100" id="copyBody" aria-label="Copy email body"><i class="bi bi-copy"></i><span class="ms-1">Copy body</span></button>
        <div class="small text-secondary mt-2" id="webmailStatus" role="status"></div>
      </section>

      <section class="panel webmail-panel mb-4">
        <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-person-vcard" style="color:var(--green)"></i><h2 class="panel-title">Personal Details</h2></div>
        <div class="row g-3">
          ${[
      ['fullName', 'Full Name'],
      ['company', 'Company Name'],
      ['address', 'Address'],
      ['contact', 'Contact'],
      ['email', 'Email Address'],
      ['website', 'Website']
    ].map(([key, label]) => `
          <div class="col-12">
            <label class="form-label" for="personal_${key}">${label}</label>
            <div class="input-group">
              <button type="button" class="btn helper-btn" data-copy-personal="${key}" aria-label="Copy ${label}"><i class="bi bi-copy"></i></button>
              <input class="form-control" id="personal_${key}" readonly value="${escapeHtml((state.personal || {})[key] || '')}" placeholder="Set ${label.toLowerCase()} in settings">
            </div>
          </div>`).join('')}
        </div>
        <div class="small text-secondary mt-2" id="personalStatus" role="status"></div>
      </section>

      <section class="panel webmail-panel">
        <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-graph-up-arrow" style="color:var(--green)"></i><h2 class="panel-title">Progress Report</h2></div>

               <div class="row mb-3 gx-2">
          <div class="col-12 col-md-6"><label class="form-label" for="webmailCountry1">Country 1</label><input class="form-control" id="webmailCountry1" value="${escapeHtml(p.country1)}" placeholder="Enter first country"></div>
          <div class="col-12 col-md-6"><label class="form-label" for="webmailCountry2">Country 2</label><input class="form-control" id="webmailCountry2" value="${escapeHtml(p.country2)}" placeholder="Enter second country"></div>
        </div>

        <div class="row mb-3 gx-2 gy-3">
          <div id="segment1Col">
            <label class="form-label" for="webmailMarketSegment">Market Segment</label>
            <div class="input-group">
              <input class="form-control" id="webmailMarketSegment" value="${escapeHtml(p.segment)}" placeholder="Enter market segment">
              <button type="button" class="btn helper-btn" id="addSegment" aria-label="Add second market segment" ${p.showSegment2 ? 'hidden' : ''}><i class="bi bi-plus-lg"></i></button>
            </div>
          </div>
          <div id="segment2Col" hidden>
            <label class="form-label" for="webmailMarketSegment2">Market Segment 2</label>
            <div class="input-group">
              <input class="form-control" id="webmailMarketSegment2" value="${escapeHtml(p.segment2)}" placeholder="Enter second market segment">
              <button type="button" class="btn helper-btn" id="removeSegment" aria-label="Remove second market segment"><i class="bi bi-dash-lg"></i></button>
            </div>
          </div>
        </div>

        <div class="mb-2"><label class="form-label" for="progressReport">Report</label><textarea class="form-control webmail-body" id="progressReport" readonly rows="5">${escapeHtml(progressText(state, p))}</textarea></div>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100" id="copyProgress" aria-label="Copy progress report"><i class="bi bi-copy"></i><span class="ms-1">Copy report</span></button>
        <div class="small text-secondary mt-2" id="progressStatus" role="status"></div>
      </section>`;
}

export function bindWebmail(state) {
  const companyInput = document.getElementById('webmailCompany');
  const subjectInput = document.getElementById('webmailSubject');
  const bodyInput = document.getElementById('webmailBody');
  const status = document.getElementById('webmailStatus');

  companyInput.addEventListener('input', () => {
    state.webmailCompany = companyInput.value;
    localStorage.setItem('webmailCompany', state.webmailCompany);
    subjectInput.value = populate(state.emailTemplates.subject, state.webmailCompany);
    bodyInput.value = populate(state.emailTemplates.body, state.webmailCompany);
  });

  const copy = async (input, statusEl, message) => {
    try { await navigator.clipboard.writeText(input.value); }
    catch { input.select(); document.execCommand('copy'); }
    statusEl.textContent = message;
  };
  document.getElementById('copySubject').addEventListener('click', () => copy(subjectInput, status, 'Subject copied to clipboard.'));
  document.getElementById('copyBody').addEventListener('click', () => copy(bodyInput, status, 'Body copied to clipboard.'));

  // --- Personal details copy buttons ---
  let personalTimer;
  document.querySelectorAll('[data-copy-personal]').forEach(btn => btn.addEventListener('click', async () => {
    const key = btn.dataset.copyPersonal;
    const field = document.getElementById(`personal_${key}`);
    if (!field.value) { document.getElementById('personalStatus').textContent = 'Nothing to copy. Add it in Settings.'; return; }
    try { await navigator.clipboard.writeText(field.value); }
    catch { field.select(); document.execCommand('copy'); }
    const icon = btn.querySelector('i');
    icon.className = 'bi bi-check2';
    const statusEl = document.getElementById('personalStatus');
    statusEl.textContent = `${field.closest('.col-12').querySelector('label').textContent} copied.`;
    clearTimeout(personalTimer);
    personalTimer = setTimeout(() => { icon.className = 'bi bi-copy'; statusEl.textContent = ''; }, 1500);
  }));

  // --- Progress report section ---
  const p = loadProgress();
  const country1 = document.getElementById('webmailCountry1');
  const country2 = document.getElementById('webmailCountry2');
  const segment = document.getElementById('webmailMarketSegment');
  const segment2 = document.getElementById('webmailMarketSegment2');
  const report = document.getElementById('progressReport');

  const refresh = () => {
    p.country1 = country1.value;
    p.country2 = country2.value;
    p.segment = segment.value;
    p.segment2 = segment2.value;
    saveProgress(p);
    report.value = progressText(state, p);
  };

  const applyLayout = () => {
    const col1 = document.getElementById('segment1Col');
    const col2 = document.getElementById('segment2Col');
    col1.className = p.showSegment2 ? 'col-12 col-md-6' : 'col-12';
    col2.className = p.showSegment2 ? 'col-12 col-md-6' : 'd-none';
    col2.hidden = !p.showSegment2;
    document.getElementById('addSegment').hidden = p.showSegment2;
  };

  [country1, country2, segment, segment2].forEach(el => el.addEventListener('input', refresh));

  document.getElementById('addSegment').addEventListener('click', () => {
    p.showSegment2 = true;
    applyLayout();
    refresh();
    segment2.focus();
  });
  document.getElementById('removeSegment').addEventListener('click', () => {
    p.showSegment2 = false;
    segment2.value = '';
    applyLayout();
    refresh();
  });

  document.getElementById('copyProgress').addEventListener('click', () =>
    copy(report, document.getElementById('progressStatus'), 'Report copied to clipboard.'));

  applyLayout();
}