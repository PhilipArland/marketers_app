import { renderDashboardHeader } from './dashboard.js';
import { applyTheme, applyPet, bindSettings, renderSettings } from './settings.js';
import { bindReportingDashboard, loadReportingState, renderReportingDashboard, resetReportingState } from './reporting.js';
import { bindWebmail, renderWebmail } from './webmail.js';
import { bindEmail, renderEmail } from './email.js';
import { bindHelper, renderHelper } from './helper.js';
import { bindCollection, renderCollection } from './collection.js';

const state = {
    name: localStorage.getItem('workspaceName') || 'User',
    emailTemplates: JSON.parse(localStorage.getItem('emailTemplates') || '{"subject":"","body":""}'),
    webmailCompany: localStorage.getItem('webmailCompany') || '',
    ...loadReportingState()
};
const pageContent = document.getElementById('pageContent');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

function updateFavicon(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#214638';
    context.beginPath();
    context.roundRect(0, 0, 64, 64, 16);
    context.fill();
    context.fillStyle = '#f3bd87';
    context.font = '700 38px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText([...name][0].toUpperCase(), 32, 34);
    let favicon = document.querySelector('link[rel="icon"]');
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    favicon.href = canvas.toDataURL('image/png');
}

let manifestUrl;
function updateManifest(name) {
    const manifest = {
        name: `${name} Workspace`,
        short_name: name,
        start_url: `${location.origin}/`,
        scope: `${location.origin}/`,
        display: 'standalone',
        background_color: '#f3e4ca',
        theme_color: '#214638'
    };
    if (manifestUrl) URL.revokeObjectURL(manifestUrl);
    manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', manifestUrl);
}

function updateBrand() {
    const name = state.name.trim() || 'User';
    document.getElementById('brandName').textContent = name;
    document.getElementById('brandMark').textContent = [...name][0].toUpperCase();
    document.title = `${name} Workspace`;
    updateFavicon(name);
    updateManifest(name); 
}

function closeSidebar() { sidebar.classList.remove('show'); backdrop.classList.remove('show'); }
function renderDashboard() {
    pageContent.innerHTML = `${renderDashboardHeader(state.name)}${renderReportingDashboard(state)}`;
    bindReportingDashboard(state, () => { resetReportingState(state); renderDashboard(); });
}
function setPage(page) {
    const titles = { dashboard: ['Workspace overview', 'Dashboard'], collection: ['Company records', 'Collection'], email: ['Email workspace', 'Email'], webmail: ['Webmail workspace', 'Webmail'], helper: ['Helper tools', 'Helper'], settings: ['Personalize your workspace', 'Settings'] };
    const selected = titles[page] ? page : 'dashboard';
    document.querySelectorAll('#sidebarNav .nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === selected));
    document.querySelectorAll('.mobile-nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === selected));
    document.getElementById('pageEyebrow').textContent = titles[selected][0];
    document.getElementById('pageTitle').textContent = titles[selected][1];
    if (selected === 'dashboard') renderDashboard();
    else if (selected === 'settings') { pageContent.innerHTML = renderSettings(state); bindSettings(state, updateBrand); }
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
