import { escapeHtml, dateKey } from './utils.js';

const KEY = 'emailReport';
const STEP = 50;

const load = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (saved?.date === dateKey(new Date()) && Number.isFinite(saved.count)) return saved.count;
    } catch { }
    return 0;
};
const save = count => localStorage.setItem(KEY, JSON.stringify({ date: dateKey(new Date()), count }));
const report = (state, count) => `Hi, I already sent ${count} emails.\n\n- ${state.name.trim() || 'User'}`;

export const getEmailCount = load;

export function renderEmail(state) {
    return `
      <section class="panel email-panel">
        <div class="d-flex align-items-center gap-2 mb-3">
          <i class="bi bi-envelope" style="color:var(--green)"></i>
          <h2 class="panel-title">Ez Email</h2>
        </div>
        <button id="emailAdd" class="btn email-add-btn w-100 mb-4">+ Add ${STEP} emails</button>
        
        <div class="d-flex justify-content-between mb-2">
            <h2 class="panel-title">Report</h2>
            <div class="d-flex gap-2">
                <button id="emailUndo" class="btn btn-sm email-undo-btn"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
                <button id="emailReset" class="btn btn-sm email-reset-btn"><i class="bi bi-arrow-clockwise"></i> Reset</button>
            </div>
        </div>
        <textarea id="emailReport" class="form-control email-report" rows="4" readonly>${escapeHtml(report(state, load()))}</textarea>
        <button type="button" class="copy-icon-btn copy-subject-btn w-100 mt-2" id="copyReport" aria-label="Copy email report"><i class="bi bi-copy"></i><span class="ms-1">Copy report</span></button>
        <div class="small text-secondary mt-2" id="emailStatus" role="status"></div>
      </section>`;
}

export function bindEmail(state) {
    const out = document.getElementById('emailReport');
    const update = count => { save(count); out.value = report(state, count); };

    document.getElementById('emailAdd').onclick = () => update(load() + STEP);
    document.getElementById('emailUndo').onclick = () => update(Math.max(0, load() - STEP));
    document.getElementById('emailReset').onclick = () => update(0);
    document.getElementById('copyReport').onclick = async () => {
        const status = document.getElementById('emailStatus');
        try {
            await navigator.clipboard.writeText(out.value);
            status.textContent = 'Report copied to clipboard!';
        } catch {
            out.select();
            document.execCommand('copy');
            status.textContent = 'Report copied to clipboard!';
        }
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    };
}