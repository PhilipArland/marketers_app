import { dateKey, escapeHtml, formatDate, isWeekend } from './utils.js';

// Nationwide holidays for 2026, based on the Official Gazette nationwide
// holiday calendar. Local holidays are intentionally excluded because they
// depend on the employee's city or province.
const HOLIDAYS_2026 = {
    '2026-01-01': "New Year's Day",
    '2026-02-17': 'Chinese New Year',
    '2026-04-02': 'Maundy Thursday',
    '2026-04-03': 'Good Friday',
    '2026-04-04': 'Black Saturday',
    '2026-04-09': 'Araw ng Kagitingan',
    '2026-05-01': 'Labor Day',
    '2026-06-12': 'Independence Day',
    '2026-08-21': 'Ninoy Aquino Day',
    '2026-08-31': 'National Heroes Day',
    '2026-11-01': "All Saints' Day",
    '2026-11-02': "All Souls' Day",
    '2026-11-30': 'Bonifacio Day',
    '2026-12-08': 'Feast of the Immaculate Conception',
    '2026-12-24': 'Christmas Eve',
    '2026-12-25': 'Christmas Day',
    '2026-12-30': 'Rizal Day',
    '2026-12-31': "New Year's Eve"
};

function holidayName(date) {
    return HOLIDAYS_2026[dateKey(date)] || '';
}

function lastMondayOfAugust(year) {
    const date = new Date(year, 7, 31);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
}

function recurringHolidayName(date) {
    const fixed = {
        '01-01': "New Year's Day", '04-09': 'Araw ng Kagitingan', '05-01': 'Labor Day',
        '06-12': 'Independence Day', '08-21': 'Ninoy Aquino Day', '11-30': 'Bonifacio Day',
        '12-08': 'Feast of the Immaculate Conception', '12-25': 'Christmas Day', '12-30': 'Rizal Day'
    };
    const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (fixed[key]) return fixed[key];
    const heroes = lastMondayOfAugust(date.getFullYear());
    return dateKey(date) === dateKey(heroes) ? 'National Heroes Day' : '';
}

function isHoliday(date) {
    return holidayName(date) || recurringHolidayName(date);
}

export function nextPayoutDate(from = new Date()) {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const candidates = [];
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
        const year = start.getFullYear();
        const month = start.getMonth() + monthOffset;
        candidates.push(new Date(year, month, 15));
        candidates.push(new Date(year, month + 1, 0));
    }
    for (const scheduled of candidates) {
        const payout = new Date(scheduled);
        while (isWeekend(payout) || isHoliday(payout)) payout.setDate(payout.getDate() - 1);
        if (payout >= start) return { scheduled, payout, adjusted: dateKey(payout) !== dateKey(scheduled) };
    }
}

export function nextHoliday(from = new Date()) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    for (let day = 0; day < 730; day++) {
        const name = isHoliday(date);
        if (name) return { date: new Date(date), name };
        date.setDate(date.getDate() + 1);
    }
}

function greeting(name, now = new Date()) {
    const hour = now.getHours();
    const salutation = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${salutation}, ${name || 'User'}.`;
}

export function renderDashboardHeader(name) {
    const payout = nextPayoutDate();
    const holiday = nextHoliday();
    return `
      <section class="dashboard-intro">
        <p class="dashboard-greeting">${escapeHtml(greeting(name))}</p>
        <p class="dashboard-helper">Here’s your workday snapshot.</p>
      </section>
      <section class="mb-4">
        <div class="row g-3">
          <div class="col-12 col-md-6"><div class="date-card payout">
            <div class="d-flex justify-content-between align-items-center"><span class="card-label">Next payout day</span><i class="bi bi-wallet2 fs-5"></i></div>
            <div class="date-value">${formatDate(payout.payout)}</div>
            <div class="date-note">${payout.adjusted ? `Adjusted from ${formatDate(payout.scheduled, { month: 'short', day: 'numeric' })} for a non-working day.` : 'Scheduled semi-monthly payout.'}</div>
          </div></div>
          <div class="col-12 col-md-6"><div class="date-card holiday">
            <div class="d-flex justify-content-between align-items-center"><span class="card-label">Next nationwide holiday</span><i class="bi bi-calendar-heart fs-5"></i></div>
            <div class="date-value">${formatDate(holiday.date)}</div>
            <div class="date-note">${escapeHtml(holiday.name)}</div>
          </div></div>
        </div>
      </section>`;
}
