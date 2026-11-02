import { dateKey, formatDate } from './utils.js';

const LOG_KEY = 'workspaceLog';
const QUOTA_KEY = 'workspaceQuota';
const CATS = [
    { key: 'collection', label: 'Collected emails', icon: 'building' },
    { key: 'email', label: 'Sent emails', icon: 'envelope' },
    { key: 'webmail', label: 'Sent webmails', icon: 'globe2' }
];
const COLS = [
    ...CATS,
    { key: 'received', label: 'Emails received' },
    { key: 'notInterested', label: 'Not interested' }
];
const KEYS = COLS.map(c => c.key);
const DEFAULT_QUOTA = { collection: 0, email: 0, webmail: 0 };
const zero = () => Object.fromEntries(KEYS.map(k => [k, 0]));

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const loadLog = () => read(LOG_KEY, {});
const saveLog = log => {
    const keep = Object.keys(log).sort().slice(-35);   // keep ~5 weeks
    localStorage.setItem(LOG_KEY, JSON.stringify(Object.fromEntries(keep.map(k => [k, log[k]]))));
};
const loadQuota = () => ({ ...DEFAULT_QUOTA, ...read(QUOTA_KEY, {}) });

const sum = (list, key) => list.reduce((t, item) => t + (Number(item[key]) || 0), 0);
const current = state => ({
    collection: sum(state.collections, 'emails'),
    email: sum(state.emailEntries, 'sent'),
    webmail: sum(state.webmailEntries, 'sent'),
    received: Number(state.responses.received) || 0,
    notInterested: Number(state.responses.notInterested) || 0
});
const todayKey = () => dateKey(new Date());

export function ensureToday() {
    const log = loadLog(), t = todayKey();
    if (log[t]) return;
    log[t] = { bank: zero(), total: zero() };
    saveLog(log);
}

export function logToday(state) {
    ensureToday();
    const log = loadLog(), t = todayKey(), c = current(state);
    KEYS.forEach(k => { log[t].total[k] = Math.max(0, (log[t].bank[k] || 0) + c[k]); });
    saveLog(log);
}

// Call right before the form Reset, so numbers already typed stay in the log
export function bankToday(state) {
    ensureToday();
    const log = loadLog(), t = todayKey(), c = current(state);
    KEYS.forEach(k => { log[t].bank[k] = (log[t].bank[k] || 0) + c[k]; });
    saveLog(log);
}

const weekDays = () => {
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 5 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
};

export function renderQuota() {
    const log = loadLog(), quota = loadQuota(), days = weekDays(), t = todayKey();
    const val = (d, key) => log[dateKey(d)]?.total?.[key] || 0;
    const totals = Object.fromEntries(CATS.map(c => [c.key, days.reduce((s, d) => s + val(d, c.key), 0)]));
    const short = { month: 'short', day: 'numeric' };

        const bars = CATS.map(({ key, label, icon }) => {
        const done = totals[key], q = quota[key];
        const pct = q ? Math.min(100, Math.round(done / q * 100)) : 0;
        const note = !q ? 'Set quota' : done >= q ? 'Quota reached' : `${q - done} left`;
        const today = log[t]?.total?.[key] || 0;
        return `<div class="col-12 col-md-4">
            <div class="quota-card ${q && done >= q ? 'is-done' : ''}">
              <div class="quota-card-top"><span>${label}</span><i class="bi bi-${icon}"></i></div>
              <div class="quota-number">${done}<small> / ${q || '-'}</small></div>
              <div class="storage-bar"><div class="storage-fill" style="width:${pct}%"></div></div>
              <div class="quota-card-foot"><span>${note}</span><span>${q ? pct + '%' : ''}</span></div>
              <div class="quota-today">Today: +${today}</div>
            </div>
        </div>`;
    }).join('');

    const rows = days.map(d => `<tr class="${dateKey(d) === t ? 'is-today' : ''}">
        <td>${formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
        ${COLS.map(c => `<td>${val(d, c.key)}</td>`).join('')}</tr>`).join('');

    return `
      <section class="panel mb-3" id="quotaPanel">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 class="panel-title">Weekly Quota</h2>
            <div class="panel-subtitle">${formatDate(days[0], short)} to ${formatDate(days[4], short)} (Mon to Fri)</div>
          </div>
          <button type="button" class="btn btn-sm helper-btn" id="quotaEdit"><i class="bi bi-pencil me-1"></i>Edit quotas</button>
        </div>

        <form id="quotaForm" class="row g-2 mb-3" hidden>
          ${CATS.map(c => `<div class="col-12 col-md-4"><label class="form-label small" for="quota_${c.key}">${c.label} quota</label><input class="form-control" type="number" min="0" id="quota_${c.key}" value="${quota[c.key]}"></div>`).join('')}
          <div class="col-12"><button type="submit" class="copy-btn w-100">Save quotas</button></div>
        </form>

        <div class="row g-3 mb-3">${bars}</div>

        <div class="table-responsive">
          <table class="table table-sm log-table mb-0">
            <thead><tr><th>Day</th>${COLS.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
}

export function bindQuota() {
    const form = document.getElementById('quotaForm');
    document.getElementById('quotaEdit').addEventListener('click', () => { form.hidden = !form.hidden; });
    form.addEventListener('submit', e => {
        e.preventDefault();
        const quota = {};
        CATS.forEach(({ key }) => { quota[key] = Math.max(0, Number(document.getElementById(`quota_${key}`).value) || 0); });
        localStorage.setItem(QUOTA_KEY, JSON.stringify(quota));
        document.getElementById('quotaPanel').outerHTML = renderQuota();
        bindQuota();
    });
}