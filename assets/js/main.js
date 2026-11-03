import './debug-date.js';
import { renderDashboardHeader } from './dashboard.js';
import { applyTheme, applyPet, bindSettings, renderSettings } from './settings.js';
import { bindReportingDashboard, loadReportingState, renderReportingDashboard, resetReportingState } from './reporting.js';
import { renderQuota, bindQuota, ensureToday, bankToday } from './quota.js';
import { bindWebmail, renderWebmail } from './webmail.js';
import { bindEmail, renderEmail } from './email.js';
import { bindHelper, renderHelper } from './helper.js';
import { bindCollection, renderCollection } from './collection.js';

const state = {
    name: localStorage.getItem('workspaceName') || 'User',
    emailTemplates: JSON.parse(localStorage.getItem('emailTemplates') || '{"subject":"","body":""}'),
    personal: JSON.parse(localStorage.getItem('personalDetails') || '{}'),
    webmailCompany: localStorage.getItem('webmailCompany') || '',
    ...loadReportingState()
};
const pageContent = document.getElementById('pageContent');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

function updateBrand() {
    const name = state.name.trim() || 'User';
    document.getElementById('brandName').textContent = name;
    document.getElementById('brandMark').textContent = [...name][0].toUpperCase();
    document.title = `${name}'s Workspace`;
}

function closeSidebar() { sidebar.classList.remove('show'); backdrop.classList.remove('show'); }
function renderDashboard() {
    pageContent.innerHTML = `${renderDashboardHeader(state.name)}${renderQuota()}`;
    bindQuota();
}
function renderReport() {
    pageContent.innerHTML = renderReportingDashboard(state);
    bindReportingDashboard(state, () => { bankToday(state); resetReportingState(state); renderReport(); });
}
function setPage(page) {
    const titles = { dashboard: ['Workspace overview', 'Dashboard'], report: ['Reporting', 'Report'], collection: ['Company records', 'Collection'], email: ['Email workspace', 'Email'], webmail: ['Webmail workspace', 'Webmail'], helper: ['Helper tools', 'Helper'], settings: ['Personalize your workspace', 'Settings'] };
    const selected = titles[page] ? page : 'dashboard';
    document.querySelectorAll('#sidebarNav .nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === selected));
    document.querySelectorAll('.mobile-nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === selected));
    document.getElementById('pageEyebrow').textContent = titles[selected][0];
    document.getElementById('pageTitle').textContent = titles[selected][1];
    if (selected === 'dashboard') renderDashboard();
    else if (selected === 'settings') { pageContent.innerHTML = renderSettings(state); bindSettings(state, updateBrand); }
    else if (selected === 'report') { renderReport(); }
    else if (selected === 'collection') { pageContent.innerHTML = renderCollection(state); bindCollection(state); }
    else if (selected === 'email') { pageContent.innerHTML = renderEmail(state); bindEmail(state); }
    else if (selected === 'webmail') { pageContent.innerHTML = renderWebmail(state); bindWebmail(state); }
    else if (selected === 'helper') { pageContent.innerHTML = renderHelper(state); bindHelper(state); }
    else pageContent.innerHTML = `<section class="panel blank-state"><div><div class="blank-icon"><i class="bi bi-${selected === 'collection' ? 'building' : selected === 'email' ? 'envelope' : 'globe2'}"></i></div><h2 class="h5 mb-2" style="color:var(--green)">${titles[selected][1]} page</h2><p class="small mb-0">This page is ready for your tools.</p></div></section>`;
}

document.getElementById('sidebarToggle').addEventListener('click', () => { sidebar.classList.toggle('show'); backdrop.classList.toggle('show'); });
backdrop.addEventListener('click', closeSidebar);
document.getElementById('sidebarNav').addEventListener('click', event => {
    const link = event.target.closest('[data-page]');
    if (!link) return;
    event.preventDefault();
    history.replaceState(null, '', `#${link.dataset.page}`);
    closeSidebar();
    setPage(link.dataset.page);
});
document.querySelector('.mobile-navbar').addEventListener('click', event => {
    const link = event.target.closest('[data-page]');
    if (!link) return;
    event.preventDefault();
    history.replaceState(null, '', `#${link.dataset.page}`);
    setPage(link.dataset.page);
});
document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
}).format(new Date());
document.getElementById('creditYear').textContent = new Date().getFullYear();
applyTheme(localStorage.getItem('workspaceTheme') || 'meadow');
updateBrand();
applyPet();
setPage(location.hash.replace('#', '') || 'dashboard');
