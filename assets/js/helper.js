const KEY = 'helperGrid';
const HKEY = 'helperGridHistory';
const ROWS = 10, COLS = 6, MAX_HISTORY = 20;
const blank = (r, c) => Array.from({ length: r }, () => Array(c).fill(''));

const load = () => {
    try {
        const g = JSON.parse(localStorage.getItem(KEY));
        if (Array.isArray(g) && g.length && g.every(Array.isArray)) return g;
    } catch { }
    return blank(ROWS, COLS);
};

// --- History (module level, so it survives leaving the page) ---
// Cut trailing empty rows/columns so each step stays small
const trim = g => {
    let rows = g.length, cols = g[0].length;
    while (rows > 1 && g[rows - 1].every(v => !v)) rows--;
    while (cols > 1 && g.slice(0, rows).every(row => !row[cols - 1])) cols--;
    return g.slice(0, rows).map(row => row.slice(0, cols));
};

// Pad a trimmed snapshot back to the minimum size plus one spare row and column
const fit = g => {
    const rows = Math.max(g.length + 1, ROWS), cols = Math.max(g[0].length + 1, COLS);
    return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => g[r]?.[c] ?? ''));
};

let history = (() => {
    try {
        const h = JSON.parse(localStorage.getItem(HKEY));
        return Array.isArray(h) ? h.filter(g => Array.isArray(g) && g.length && g.every(Array.isArray)) : [];
    } catch { return []; }
})();

let historyTimer;
const flushHistory = () => {
    clearTimeout(historyTimer);
    try { localStorage.setItem(HKEY, JSON.stringify(history)); }
    catch { history.splice(0, Math.ceil(history.length / 2)); }   // storage full: drop the oldest half
};
const saveHistory = () => {
    clearTimeout(historyTimer);
    historyTimer = setTimeout(flushHistory, 500);
};
window.addEventListener('pagehide', flushHistory);

const colName = i => {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
};

const esc = v => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const tableHtml = grid => `
  <table>
    <thead><tr><th></th>${grid[0].map((_, c) => `
      <th><span>${colName(c)}</span><button type="button" class="col-copy" data-copycol="${c}" title="Copy column ${colName(c)}" aria-label="Copy column ${colName(c)}"><i class="bi bi-copy"></i></button></th>`).join('')}
    </tr></thead>
    <tbody>${grid.map((row, r) => `<tr><th>${r + 1}</th>${row.map((v, c) =>
    `<td><input data-r="${r}" data-c="${c}" value="${esc(v)}" autocomplete="off"></td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>`;

export function renderHelper(state) {
    return `
      <section class="panel helper-panel">
        <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-tools" style="color:var(--green)"></i><h2 class="panel-title">Ez Helper</h2></div>
        <div class="d-flex justify-content-between">
            <div class="d-flex flex-wrap gap-2 mb-3">
                <button class="btn btn-sm helper-btn" data-act="undo" id="helperUndo"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
                <button class="btn btn-sm helper-btn" data-act="copyAll"><i class="bi bi-copy"></i> Copy all</button>
            </div>
            <div class="d-flex flex-wrap gap-2 mb-3">
                <button class="btn btn-sm helper-clear-btn" data-act="clear"><i class="bi bi-trash3"></i> Clear all</button>
            </div>
        </div>
        <div class="helper-grid" id="helperGrid"></div>
        <div class="small text-secondary mt-2" id="helperStatus" role="status">Paste from Excel or Sheets into any cell. Drag to select, Ctrl+C to copy, Ctrl+Z to undo.</div>
      </section>`;
}

export function bindHelper(state) {
    const wrap = document.getElementById('helperGrid');
    const status = document.getElementById('helperStatus');
    const undoBtn = document.getElementById('helperUndo');
    const panel = wrap.closest('.helper-panel');

    let grid = load();
    let anchor = null, sel = null;
    let typing = false;   // true while editing one cell, so a burst of typing is one undo step

    const save = () => localStorage.setItem(KEY, JSON.stringify(grid));
    const say = msg => { status.textContent = msg; };
    const pos = el => ({ r: +el.dataset.r, c: +el.dataset.c });
    const cell = (r, c) => wrap.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
    const focusCell = (r, c) => { const el = cell(r, c); if (el) { el.focus(); el.select(); } };
    const range = () => sel && {
        r1: Math.min(sel.r1, sel.r2), r2: Math.max(sel.r1, sel.r2),
        c1: Math.min(sel.c1, sel.c2), c2: Math.max(sel.c1, sel.c2)
    };
    const isMulti = () => sel && (sel.r1 !== sel.r2 || sel.c1 !== sel.c2);
    const tsv = (r1, c1, r2, c2) => grid.slice(r1, r2 + 1).map(row => row.slice(c1, c2 + 1).join('\t')).join('\n');

    // Whole column, down to the last filled cell
    const colText = c => {
        let last = grid.length - 1;
        while (last > 0 && !grid[last][c]) last--;
        return grid.slice(0, last + 1).map(row => row[c]).join('\n');
    };

    // --- History / undo ---
    const updateUndo = () => { undoBtn.disabled = history.length === 0; };
    const pushHistory = () => {
        const snap = trim(grid);
        if (history.length && JSON.stringify(history.at(-1)) === JSON.stringify(snap)) return;
        history.push(snap);
        if (history.length > MAX_HISTORY) history.shift();
        saveHistory();
        updateUndo();
    };
    const undo = () => {
        if (!history.length) return;
        grid = fit(history.pop());
        sel = null; typing = false;
        save(); saveHistory(); draw(); updateUndo();
        say('Undone.');
    };

    const paint = () => {
        wrap.querySelectorAll('td.sel').forEach(td => td.classList.remove('sel'));
        const g = isMulti() && range();
        if (!g) return;
        for (let r = g.r1; r <= g.r2; r++)
            for (let c = g.c1; c <= g.c2; c++) cell(r, c)?.parentElement.classList.add('sel');
    };
    const draw = () => { wrap.innerHTML = tableHtml(grid); paint(); };
    const resize = (rows, cols) => {
        const width = Math.max(cols, grid[0].length);
        grid.forEach(row => { while (row.length < width) row.push(''); });
        while (grid.length < rows) grid.push(Array(width).fill(''));
    };

    // --- Typing: auto-grows when you type in the last row or column ---
    wrap.addEventListener('input', e => {
        const { r, c } = pos(e.target);
        const v = e.target.value;
        if (!typing) { pushHistory(); typing = true; }
        grid[r][c] = v;

        let grew = false;
        if (v && r === grid.length - 1) { grid.push(Array(grid[0].length).fill('')); grew = true; }
        if (v && c === grid[0].length - 1) { grid.forEach(row => row.push('')); grew = true; }
        save();

        if (grew) {
            draw();
            const el = cell(r, c);
            el.focus();
            el.setSelectionRange(v.length, v.length);
            typing = true;
        }
    });
    wrap.addEventListener('focusout', () => { typing = false; });

    wrap.addEventListener('keydown', e => {
        const { r, c } = pos(e.target);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault(); undo();
        }
        else if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); focusCell(r + (e.shiftKey && e.key === 'Enter' ? -1 : 1), c); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(r - 1, c); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && isMulti()) {
            e.preventDefault();
            pushHistory();
            const g = range();
            for (let i = g.r1; i <= g.r2; i++) for (let j = g.c1; j <= g.c2; j++) grid[i][j] = '';
            save(); draw();
        }
        else if (e.key === 'Escape') { sel = null; paint(); }
    });

    // --- Selection by drag or shift+click ---
    wrap.addEventListener('mousedown', e => {
        if (e.target.tagName !== 'INPUT') return;
        const p = pos(e.target);
        if (e.shiftKey && anchor) { sel = { r1: anchor.r, c1: anchor.c, r2: p.r, c2: p.c }; getSelection().removeAllRanges(); }
        else { anchor = p; sel = null; }
        paint();
    });
    wrap.addEventListener('mouseover', e => {
        if (e.buttons !== 1 || !anchor || e.target.tagName !== 'INPUT') return;
        const p = pos(e.target);
        sel = { r1: anchor.r, c1: anchor.c, r2: p.r, c2: p.c };
        if (isMulti()) getSelection().removeAllRanges();
        paint();
    });

    // --- Copy a selected range ---
    wrap.addEventListener('copy', e => {
        if (!isMulti()) return;
        const g = range();
        e.clipboardData.setData('text/plain', tsv(g.r1, g.c1, g.r2, g.c2));
        e.preventDefault();
        say(`Copied ${(g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1)} cells.`);
    });

    // --- Paste ---
    wrap.addEventListener('paste', e => {
        const text = e.clipboardData.getData('text').replace(/\r/g, '').replace(/\n$/, '');
        const rows = text.split('\n').map(line => line.split('\t'));
        if (rows.length === 1 && rows[0].length === 1) return;   // single value: normal paste
        e.preventDefault();
        pushHistory();
        const g = isMulti() ? range() : null;
        const start = g ? { r: g.r1, c: g.c1 } : pos(e.target);
        const width = Math.max(...rows.map(r => r.length));
        // +1 keeps one spare blank row and column after pasted data
        resize(start.r + rows.length + 1, start.c + width + 1);
        rows.forEach((row, i) => row.forEach((v, j) => { grid[start.r + i][start.c + j] = v; }));
        sel = null; save(); draw();
        focusCell(start.r, start.c);
        say(`Pasted ${rows.length} rows x ${width} columns.`);
    });

    const clearAll = () => {
        pushHistory();
        grid = blank(ROWS, COLS);
        sel = null; typing = false;
        save(); draw(); updateUndo();
        say('Sheet cleared. Press Undo to bring it back.');
    };

    // --- Toolbar and column copy buttons ---
    panel.addEventListener('click', async e => {
        const colBtn = e.target.closest('[data-copycol]');
        if (colBtn) {
            const c = +colBtn.dataset.copycol;
            const text = colText(c);
            if (!text.replace(/\n/g, '')) { say(`Column ${colName(c)} is empty.`); return; }
            try { await navigator.clipboard.writeText(text); }
            catch { say('Copy failed. Select cells and press Ctrl+C instead.'); return; }
            const icon = colBtn.querySelector('i');
            icon.className = 'bi bi-check-lg';
            setTimeout(() => { icon.className = 'bi bi-copy'; }, 1500);
            say(`Copied column ${colName(c)} (${text.split('\n').length} rows).`);
            return;
        }

        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'undo') undo();
        else if (act === 'clear') clearAll();
        else if (act === 'copyAll') {
            const used = trim(grid);
            if (!used.some(row => row.some(Boolean))) { say('Sheet is empty.'); return; }
            try { await navigator.clipboard.writeText(used.map(row => row.join('\t')).join('\n')); say('Whole sheet copied.'); }
            catch { say('Copy failed. Select cells and press Ctrl+C instead.'); }
        }
    });

    draw();
    updateUndo();
}