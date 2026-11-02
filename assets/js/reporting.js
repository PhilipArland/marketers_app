import { escapeHtml, formatDate } from './utils.js';
import { logToday } from './quota.js';

const STORAGE_KEY = 'workspaceReporting';
const blankCollection = () => ({ country: '', segment: '', names: '', emails: '' });
const blankDelivery = () => ({ country: '', segment: '', product: '', sent: '' });
const todayKey = () => new Date().toLocaleDateString('en-CA');
const locationName = state => state.locationType === 'state' ? 'State' : 'Country';
const pluralLocation = (value, state) => {
    const multiple = value.split(',').filter(part => part.trim()).length > 1;
    if (!multiple) return locationName(state);
    return state.locationType === 'state' ? 'States' : 'Countries';
};

export function loadReportingState() {
    const defaults = { collections: [blankCollection()], emailEntries: [blankDelivery()], webmailEntries: [blankDelivery()], responses: { received: '0', notInterested: '0' }, visible: { collection: true, email: false, webmail: false }, locationType: 'country', responseDate: todayKey() };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) return defaults;
        const reporting = { ...defaults, ...saved, visible: { ...defaults.visible, ...saved.visible }, responses: { ...defaults.responses, ...saved.responses } };
        if (!Array.isArray(reporting.collections) || !reporting.collections.length) reporting.collections = [blankCollection()];
        if (!Array.isArray(reporting.emailEntries) || !reporting.emailEntries.length) reporting.emailEntries = [blankDelivery()];
        if (!Array.isArray(reporting.webmailEntries) || !reporting.webmailEntries.length) reporting.webmailEntries = [blankDelivery()];
        if (reporting.responseDate !== todayKey()) {
            reporting.responses = { received: '0', notInterested: '0' };
            reporting.collections.forEach(item => { item.names = ''; item.emails = ''; });
            reporting.emailEntries.forEach(item => { item.sent = ''; });
            reporting.webmailEntries.forEach(item => { item.sent = ''; });
            reporting.responseDate = todayKey();
        }
        return reporting;
    } catch { return defaults; }
}
export function saveReportingState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ collections: state.collections, emailEntries: state.emailEntries, webmailEntries: state.webmailEntries, responses: state.responses, visible: state.visible, locationType: state.locationType, responseDate: todayKey() }));
}
const collectionBlock = (item, state) => `COMPANY NAME COLLECTION\n${pluralLocation(item.country, state)}: ${item.country}\nMarket Segment: ${item.segment}\nNo. of Collected Company Names: ${item.names}\nNo. of Collected Company Emails: ${item.emails}`;
const deliveryBlock = (title, item, countLabel, state) => `${title}\n${pluralLocation(item.country, state)}: ${item.country}\nMarket Segment: ${item.segment}\nProduct Line: ${item.product}\n${countLabel}: ${item.sent}`;
export function reportText(state) {
    const now = new Date();
    const dateHeading = `${formatDate(now)}${now.getHours() < 13 ? ' (Mid-Day Report)' : ''}`;
    const sections = [];
    if (state.visible.collection) sections.push(state.collections.map(item => collectionBlock(item, state)).join('\n\n'));
    if (state.visible.email) sections.push(state.emailEntries.map(item => deliveryBlock('SENDING EMAILS', item, 'No. of Sent Emails', state)).join('\n\n'));
    if (state.visible.webmail) sections.push(state.webmailEntries.map(item => deliveryBlock('SENDING WEBMAILS', item, 'No. of Sent Webmails', state)).join('\n\n'));
    sections.push(`Emails Received: ${state.responses.received || '0'}\nNot Interested: ${state.responses.notInterested || '0'}`);
    return `${dateHeading}\n\n${sections.join('\n\n')}\n\nThank you.\n\n- ${state.name.trim() || 'User'}`;
}
function input(label, value, key, group, index, type = 'text', placeholder = '') {
    return `<div class="col-12 col-md-6"><label class="form-label">${label}</label><input type="${type}" ${type === 'number' ? 'min="0"' : ''} class="form-control" data-report-group="${group}" data-report-index="${index}" data-report-key="${key}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></div>`;
}
function entryCard(title, content, remove = '') { return `<article class="report-entry"><div class="report-entry-heading"><div class="report-entry-title">${title}</div>${remove}</div><div class="row g-3">${content}</div></article>`; }
function collectionEntries(state) {
    return state.collections.map((item, index) => entryCard(state.collections.length > 1 ? `Company Collection ${index + 1}` : 'Company Collection', [input(locationName(state), item.country, 'country', 'collections', index, 'text', `Enter ${locationName(state).toLowerCase()}`), input('Market Segment', item.segment, 'segment', 'collections', index, 'text', 'Enter Market Segment'), input('No. of Collected Company Names', item.names, 'names', 'collections', index, 'number', '0'), input('No. of Collected Company Emails', item.emails, 'emails', 'collections', index, 'number', '0')].join(''), index ? `<button class="remove-entry-btn" type="button" data-remove-entry="collections" data-remove-index="${index}" aria-label="Remove this company collection"><i class="bi bi-x-lg"></i></button>` : '')).join('');
}
function deliveryEntries(state, group, title, countLabel) {
    return state[group].map((item, index) => entryCard(state[group].length > 1 ? `${title} ${index + 1}` : title, [input(locationName(state), item.country, 'country', group, index, 'text', `Enter ${locationName(state).toLowerCase()}`), input('Market Segment', item.segment, 'segment', group, index, 'text', 'Enter Market Segment'), input('Product Line', item.product, 'product', group, index, 'text', 'Enter Product Line'), input(countLabel, item.sent, 'sent', group, index, 'number', '0')].join(''), index ? `<button class="remove-entry-btn" type="button" data-remove-entry="${group}" data-remove-index="${index}" aria-label="Remove this entry"><i class="bi bi-x-lg"></i></button>` : '')).join('');
}
function section(type, title, entries, open) { return `<section class="report-form-section" ${open ? '' : 'hidden'}><div class="report-section-heading"><h3>${title}</h3><button class="add-entry-btn" type="button" data-add-entry="${type}" aria-label="Add another ${title}"><i class="bi bi-plus-lg"></i></button></div><div class="report-entry-list">${entries}</div></section>`; }
function fieldsHtml(state) {
    return `${section('collection', 'Company Collection', collectionEntries(state), state.visible.collection)}${section('email', 'Sending Emails', deliveryEntries(state, 'emailEntries', 'Sending Emails', 'No. of Sent Emails'), state.visible.email)}${section('webmail', 'Sending Webmails', deliveryEntries(state, 'webmailEntries', 'Sending Webmails', 'No. of Sent Webmails'), state.visible.webmail)}<section class="report-form-section responses-section"><div class="report-section-heading"><h3>Responses</h3></div><div class="row g-3">${input('Emails Received', state.responses.received, 'received', 'responses', 0, 'number', '0')}${input('Not interested', state.responses.notInterested, 'notInterested', 'responses', 0, 'number', '0')}</div></section>`;
}
function updatePreview(state) {
    const lines = reportText(state).split('\n');
    document.getElementById('reportPreview').innerHTML = `<div class="report-date">${escapeHtml(lines.shift())}</div>${escapeHtml(lines.join('\n')).replace(/(COMPANY NAME COLLECTION|SENDING EMAILS|SENDING WEBMAILS)/g, '<strong class="report-heading">$1</strong>')}`;
}
function updateButtons(state) { document.querySelectorAll('[data-toggle-section]').forEach(button => { const open = state.visible[button.dataset.toggleSection]; button.classList.toggle('active', open); button.setAttribute('aria-expanded', String(open)); }); }
function bindFields(state, refresh) {
    document.querySelectorAll('[data-report-key]').forEach(element => element.addEventListener('input', () => { const { reportGroup: group, reportKey: key, reportIndex: index } = element.dataset; if (group === 'responses') state.responses[key] = element.value; else state[group][Number(index)][key] = element.value; saveReportingState(state); logToday(state); updatePreview(state); })); document.querySelectorAll('[data-add-entry]').forEach(button => button.addEventListener('click', () => { const type = button.dataset.addEntry; if (type === 'collection') state.collections.push(blankCollection()); else if (type === 'email') state.emailEntries.push(blankDelivery()); else state.webmailEntries.push(blankDelivery()); saveReportingState(state); refresh(); }));
    document.querySelectorAll('[data-remove-entry]').forEach(button => button.addEventListener('click', () => { state[button.dataset.removeEntry].splice(Number(button.dataset.removeIndex), 1); saveReportingState(state); logToday(state); refresh(); }));
}
export function renderReportingDashboard(state) {
    const locationButton = state.locationType === 'state' ? 'Use Country' : 'Use State';
    return `<section class="row g-3 align-items-start"><div class="col-12 col-xl-6"><div class="panel"><div class="d-flex align-items-center gap-2 mb-1"><i class="bi bi-pencil-square" style="color:var(--green)"></i><h2 class="panel-title">Ez Report</h2></div><p class="panel-subtitle mb-3">Choose a category</p><div class="d-flex flex-wrap gap-2 mb-4"><button class="mode-btn active" type="button" data-toggle-section="collection">Collection</button><button class="mode-btn" type="button" data-toggle-section="email">Email</button><button class="mode-btn" type="button" data-toggle-section="webmail">Webmail</button><button class="mode-btn" type="button" id="toggleLocation"><i class="bi bi-arrow-left-right me-1"></i>${locationButton}</button><button class="mode-btn reset-btn" type="button" id="resetInputs">Reset</button></div><div id="inputFields">${fieldsHtml(state)}</div></div></div><div class="col-12 col-xl-6"><div class="panel report-panel"><div class="d-flex justify-content-between align-items-start gap-2 mb-3"><div><h2 class="panel-title">Daily report</h2><p class="panel-subtitle mb-0">Live preview of your report</p></div><div class="d-flex align-items-center gap-2"><button class="copy-icon-btn" type="button" data-copy-report aria-label="Copy report text"><i class="bi bi-copy"></i></button><span class="badge rounded-pill text-bg-success-subtle border border-success-subtle" style="color:var(--green)!important">Live</span></div></div><div class="report-paper mb-3" id="reportPreview" aria-live="polite"></div><button class="copy-btn w-100" type="button" data-copy-report><i class="bi bi-copy me-2"></i>Copy text</button><div class="small text-secondary text-center mt-2" id="copyStatus" role="status"></div></div></div></section>`;
}
export function bindReportingDashboard(state, onReset) {
    const refresh = () => { document.getElementById('inputFields').innerHTML = fieldsHtml(state); bindFields(state, refresh); updateButtons(state); updatePreview(state); };
    document.querySelectorAll('[data-toggle-section]').forEach(button => button.addEventListener('click', () => { const type = button.dataset.toggleSection; state.visible[type] = !state.visible[type]; saveReportingState(state); refresh(); }));
    document.getElementById('toggleLocation').addEventListener('click', event => {
        state.locationType = state.locationType === 'state' ? 'country' : 'state';
        event.currentTarget.innerHTML = `<i class="bi bi-arrow-left-right me-1"></i>${state.locationType === 'state' ? 'Use Country' : 'Use State'}`;
        saveReportingState(state);
        refresh();
    });
    document.getElementById('resetInputs').addEventListener('click', onReset);
    document.querySelectorAll('[data-copy-report]').forEach(button => button.addEventListener('click', async () => { try { await navigator.clipboard.writeText(reportText(state)); } catch { const area = document.createElement('textarea'); area.value = reportText(state); document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); } document.getElementById('copyStatus').textContent = 'Report copied to clipboard.'; }));
    bindFields(state, refresh); updateButtons(state); updatePreview(state);
}
export function resetReportingState(state) {
    state.collections = [blankCollection()]; state.emailEntries = [blankDelivery()]; state.webmailEntries = [blankDelivery()];
    state.responses = { received: '0', notInterested: '0' }; state.visible = { collection: true, email: false, webmail: false }; state.locationType = 'country'; state.responseDate = todayKey(); saveReportingState(state);
}
