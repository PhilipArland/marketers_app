export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
}

export function formatDate(date, options = { month: 'long', day: 'numeric', year: 'numeric' }) {
    return new Intl.DateTimeFormat('en-PH', options).format(date);
}

export function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
}
