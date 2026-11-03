import { escapeHtml } from './utils.js';

const KEY = 'collectionState';
const DEFAULT = { country1: '', segment1: '', country2: '', segment2: '', showSecond: false, hideDone: true, citiesText: '', cities: [] };

const load = () => {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) }; }
  catch { return { ...DEFAULT }; }
};

const lastDone = p => p.cities.map(c => c.done).lastIndexOf(true);
const nextIndex = p => {
  const last = lastDone(p);
  let i = p.cities.findIndex((c, idx) => !c.done && idx > last);
  if (i < 0) i = p.cities.findIndex(c => !c.done);
  return i;
};

const reportText = (state, p) => {
  const c1 = p.country1.trim() || '';
  const s1 = p.segment1.trim() || '';
  const c2 = p.country2.trim() || '';
  const s2 = p.segment2.trim() || '';
  const name = (state.name || '').trim() || 'User';

  const last = lastDone(p);
  const finished = last >= 0 ? p.cities[last].name : '';
  const allDone = p.cities.length > 0 && p.cities.every(c => c.done);

  let next;
  if (allDone || p.showSecond) next = `${c2} for ${s2}`;
  else { const i = nextIndex(p); next = `${i >= 0 ? p.cities[i].name : ''}, ${c1}`; }

  return `Hi, I have finished collecting company names and emails in ${finished}, ${c1} for ${s1}. I will start collecting in ${next} now.\n\n- ${name}`;
};

export function renderCollection(state) {
  const p = load();
  return `
      <div class="row g-3">
        <div class="col-12 col-lg-6">
          <section class="panel collection-panel h-100">
            <div class="d-flex align-items-center gap-2 mb-3"><i class="bi bi-building" style="color:var(--green)"></i><h2 class="panel-title">Ez Collection</h2></div>

            <div class="row mb-3 gx-2">
              <div class="col-md-6"><label class="form-label" for="collCountry1">Country</label><input class="form-control" id="collCountry1" value="${escapeHtml(p.country1)}" placeholder="Enter country"></div>
              <div class="col-md-6"><label class="form-label" for="collSegment1">Market Segment</label>
                <div class="input-group">
                  <input class="form-control" id="collSegment1" value="${escapeHtml(p.segment1)}" placeholder="Enter market segment">
                  <button type="button" class="btn helper-btn" id="collAdd" aria-label="Add second country and market segment" ${p.showSecond ? 'hidden' : ''}><i class="bi bi-plus-lg"></i></button>
                </div>
              </div>
            </div>

            <div id="collSecond" ${p.showSecond ? '' : 'hidden'}>
              <div class="row mb-3 gx-2">
                <div class="col-md-6"><label class="form-label" for="collCountry2">Country 2</label><input class="form-control" id="collCountry2" value="${escapeHtml(p.country2)}" placeholder="Enter second country"></div>
                <div class="col-md-6"><label class="form-label" for="collSegment2">Market Segment 2</label>
                  <div class="input-group">
                    <input class="form-control" id="collSegment2" value="${escapeHtml(p.segment2)}" placeholder="Enter second market segment">
                    <button type="button" class="btn helper-btn" id="collRemove" aria-label="Remove second country"><i class="bi bi-dash-lg"></i></button>
                  </div>
                </div>
              </div>
            </div>

            <label class="form-label" for="collCities">Cities (1 per line)</label>
            <textarea class="form-control mb-2 collect-area" id="collCities" rows="10" placeholder="Paste or type one city per line">${escapeHtml(p.citiesText)}</textarea>
            <button type="button" class="copy-btn w-100 mb-3" id="collGenerate"><i class="bi bi-list-check me-1"></i>Generate Cities</button>
            <div class="collect-list" id="collList"></div>
          </section>
        </div>

        <div class="col-12 col-lg-6">
          <section class="panel collection-panel h-100">
            <div class="d-flex justify-content-between small mb-1"><span class="form-label mb-0">Progress</span><span id="collProgressText" style="color:var(--muted)"></span></div>
            <div class="storage-bar mb-3"><div class="storage-fill" id="collProgressFill"></div></div>

            <div class="d-flex gap-2 mb-3">
              <button type="button" class="copy-btn flex-grow-1" id="collNext"><i class="bi bi-check2-circle me-1"></i><span id="collNextText"></span></button>
              <button type="button" class="btn helper-btn text-nowrap" id="collUndo"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
            </div>

            <label class="form-label" for="collReport">Generated Message</label>
            <textarea class="form-control webmail-body mb-2" id="collReport" readonly rows="5">${escapeHtml(reportText(state, p))}</textarea>
            <button type="button" class="copy-icon-btn copy-subject-btn w-100" id="collCopy"><i class="bi bi-copy"></i><span class="ms-1">Copy message</span></button>
            <div class="small text-secondary mt-2" id="collStatus" role="status"></div>
          </section>
        </div>
      </div>`;
}

export function bindCollection(state) {
  const $ = id => document.getElementById(id);
  let p = load();

  const renderList = scroll => {
    const next = nextIndex(p);
    $('collList').innerHTML = p.cities.map((c, i) =>
      `<label class="collect-city ${i === next ? 'is-next' : ''}"><input type="checkbox" data-i="${i}" ${c.done ? 'checked' : ''}><span>${escapeHtml(c.name)}</span>${i === next ? '<em>current</em>' : ''}</label>`).join('')
      || '<div class="small text-secondary p-2">No cities yet. Add some on the left and press Generate Cities.</div>';
    if (scroll) {
      const el = $('collList').querySelector('.is-next');
      if (el) $('collList').scrollTop = Math.max(0, el.offsetTop - 8);
    }
  };

  const refresh = scroll => {
    localStorage.setItem(KEY, JSON.stringify(p));
    $('collReport').value = reportText(state, p);
    const done = p.cities.filter(c => c.done).length;
    const pct = p.cities.length ? Math.round(done / p.cities.length * 100) : 0;
    $('collProgressFill').style.width = `${pct}%`;
    $('collProgressText').textContent = `${done}/${p.cities.length} (${pct}%)`;
    const next = nextIndex(p);
    $('collNextText').textContent = next >= 0 ? `Done with ${p.cities[next].name}` : (p.cities.length ? 'All cities done' : 'Mark current city done');
    $('collNext').disabled = next < 0;
    $('collUndo').disabled = lastDone(p) < 0;
    renderList(scroll);
  };

  // Text fields
  [['collCountry1', 'country1'], ['collSegment1', 'segment1'], ['collCountry2', 'country2'], ['collSegment2', 'segment2'], ['collCities', 'citiesText']]
    .forEach(([id, key]) => $(id).addEventListener('input', e => {
      p[key] = e.target.value;
      localStorage.setItem(KEY, JSON.stringify(p));
      $('collReport').value = reportText(state, p);
    }));

  // + / - second country (report switches to Country 2 automatically)
  const showSecond = on => {
    p.showSecond = on;
    $('collSecond').hidden = !on;
    $('collAdd').hidden = on;
    refresh(false);
  };
  $('collAdd').addEventListener('click', () => { showSecond(true); $('collCountry2').focus(); });
  $('collRemove').addEventListener('click', () => showSecond(false));

  // Generate checklist (keeps already-checked cities)
  $('collGenerate').addEventListener('click', () => {
    const old = new Map(p.cities.map(c => [c.name.toLowerCase(), c.done]));
    const names = [...new Set(p.citiesText.split('\n').map(s => s.trim()).filter(Boolean))];
    p.cities = names.map(name => ({ name, done: old.get(name.toLowerCase()) || false }));
    $('collStatus').textContent = `${names.length} cities loaded.`;
    refresh(true);
  });

  const setDone = (i, done) => {
    if (!p.cities[i]) return;
    p.cities[i].done = done;
    refresh(true);
  };
  $('collNext').addEventListener('click', () => setDone(nextIndex(p), true));
  $('collUndo').addEventListener('click', () => setDone(lastDone(p), false));
  $('collList').addEventListener('change', e => {
    const i = e.target.dataset.i;
    if (i !== undefined) setDone(+i, e.target.checked);
  });

  // Copy
  $('collCopy').addEventListener('click', async () => {
    const out = $('collReport');
    try { await navigator.clipboard.writeText(out.value); }
    catch { out.select(); document.execCommand('copy'); }
    $('collStatus').textContent = 'Message copied to clipboard.';
  });

  refresh(true);
}