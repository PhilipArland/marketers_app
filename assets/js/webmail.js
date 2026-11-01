import { escapeHtml } from './utils.js';

const PROGRESS_KEY = 'webmailProgress';
const DEFAULT_PROGRESS = { country1: '', country2: '', segment: '', segment2: '', showSegment2: false };

const loadProgress = () => {
    try { return { ...DEFAULT_PROGRESS, ...JSON.parse(localStorage.getItem(PROGRESS_KEY)) }; }
    catch { return { ...DEFAULT_PROGRESS }; }
};
const saveProgress = p => localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));

const progressText = (state, p) => {
    const country1 = p.country1.trim() || '{country1}';
    const country2 = p.country2.trim() || '{country2}';
    const segment = p.segment.trim() || '{segment}';
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
        <div class="d-flex align-items-center gap-2 mb-1"><i class="bi bi-globe2" style="color:var(--green)"></i><h2 class="panel-title">Ez Webmail</h2></div>
        <div class="mb-4"><label class="form-label" for="webmailCompany">Company Name</label><input class="form-control" id="webmailCompany" maxlength="120" value="${escapeHtml(company)}" placeholder="Enter company name"></div>
        <div class="mb-2"><div class="d-flex align-items-center justify-content-between gap-3 mb-2"><label class="form-label mb-0" for="webmailSubject">Email Subject</label></div><input class="form-control" id="webmailSubject" readonly value="${escapeHtml(subject)}" placeholder="Set a Subject Template in Settings"></div>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100 mb-4" id="copySubject" aria-label="Copy email subject"><i class="bi bi-copy"></i><span class="ms-1">Copy subject</span></button>
        <div class="mb-2"><label class="form-label" for="webmailBody">Email Body</label><textarea class="form-control webmail-body" id="webmailBody" readonly rows="11" placeholder="Set a Body Template in Settings">${escapeHtml(body)}</textarea></div>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100" id="copyBody" aria-label="Copy email body"><i class="bi bi-copy"></i><span class="ms-1">Copy body</span></button>
        <div class="small text-secondary mt-2" id="webmailStatus" role="status"></div>
      </section>

      <section class="panel webmail-panel">
        <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-graph-up-arrow" style="color:var(--green)"></i><h2 class="panel-title">Progress Report</h2></div>

        <div class="row g-3 mb-3">
          <div class="col-12 col-md-6"><label class="form-label" for="webmailCountry1">Country 1</label><input class="form-control" id="webmailCountry1" value="${escapeHtml(p.country1)}" placeholder="Enter first country"></div>
          <div class="col-12 col-md-6"><label class="form-label" for="webmailCountry2">Country 2</label><input class="form-control" id="webmailCountry2" value="${escapeHtml(p.country2)}" placeholder="Enter second country"></div>
        </div>

        <div class="row g-3 mb-3" id="segmentRow">
          <div id="segment1Col"><label class="form-label" for="webmailMarketSegment">Market Segment</label><input class="form-control" id="webmailMarketSegment" value="${escapeHtml(p.segment)}" placeholder="Enter market segment"></div>
          <div id="addSegmentCol" class="d-flex align-items-end"><button type="button" class="btn w-100" id="addSegment" aria-label="Add second market segment" style="background:var(--green);color:var(--cream);"><i class="bi bi-plus-lg"></i></button></div>
          <div id="segment2Col">
            <div class="d-flex justify-content-between align-items-center"><label class="form-label" for="webmailMarketSegment2">Market Segment 2</label><button type="button" class="btn btn-link btn-sm p-0 mb-2" id="removeSegment" style="color:var(--green)"><i class="bi bi-x-lg"></i></button></div>
            <input class="form-control" id="webmailMarketSegment2" value="${escapeHtml(p.segment2)}" placeholder="Enter second market segment">
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

    // --- Progress report section ---
    const p = loadProgress();
    const country1 = document.getElementById('webmailCountry1');
    const country2 = document.getElementById('webmailCountry2');
    const segment = document.getElementById('webmailMarketSegment');
    const segment2 = document.getElementById('webmailMarketSegment2');
    const report = document.getElementById('progressReport');
    const segment1Col = document.getElementById('segment1Col');
    const addCol = document.getElementById('addSegmentCol');
    const segment2Col = document.getElementById('segment2Col');

    const refresh = () => {
        p.country1 = country1.value;
        p.country2 = country2.value;
        p.segment = segment.value;
        p.segment2 = segment2.value;
        saveProgress(p);
        report.value = progressText(state, p);
    };

    // Segment 1 is col-11 with the + button; after clicking +, both segments become col-6.
    const applyLayout = () => {
        segment1Col.className = p.showSegment2 ? 'col-12 col-md-6' : 'col-12 col-md-11';
        addCol.className = p.showSegment2 ? 'd-none' : 'col-12 col-md-1 d-flex align-items-end';
        segment2Col.className = p.showSegment2 ? 'col-12 col-md-6' : 'd-none';
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