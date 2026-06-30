/* ─── COSTANTI ─── */
const MESI_KEYS  = ['settembre','ottobre','novembre','dicembre','gennaio','febbraio','marzo','aprile','maggio','giugno'];
const MESI_SHORT = ['Set','Ott','Nov','Dic','Gen','Feb','Mar','Apr','Mag','Giu'];
const MESI_JS    = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const MESI_NOMI  = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

const FREQ_IMPORTO   = { Lezione: 5, 'Metà mese': 20, Mensile: 35, Trimestrale: 95, Stagionale: 240 };
const ISCRIZIONE_QUOTA = 30;

let sortKey = 'nome';
let sortAsc = true;

/* ─── STORAGE – unico database ─── */
function loadMain()  { return JSON.parse(localStorage.getItem('avisBasketPagamenti') || '[]'); }
function saveMain(d) { localStorage.setItem('avisBasketPagamenti', JSON.stringify(d)); }

function blankMesi() {
  const m = {};
  MESI_KEYS.forEach(k => m[k] = 0);
  return m;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── COSTRUISCE DATI ATLETI DAL REGISTRO ─── */
function buildAthleteData() {
  const main = loadMain();
  const map  = new Map();
  for (const r of main) {
    if (!r.nomeRagazzo) continue;
    if (!map.has(r.nomeRagazzo)) {
      map.set(r.nomeRagazzo, {
        anno:         r.anno || '',
        iscrizione:   false,
        nomeGenitore: '',
        telefono:     '',
        mesi:         blankMesi()
      });
    }
    const entry = map.get(r.nomeRagazzo);
    if (r.iscrizione)              entry.iscrizione   = true;
    if (r.nomeGenitore)            entry.nomeGenitore = r.nomeGenitore;
    if (r.telefono)                entry.telefono     = r.telefono;
    if (!entry.anno && r.anno)     entry.anno         = r.anno;
    // Accumula distribuzione mensile
    if (r.frequenza && r.dataPagamento) {
      const dist = calcDistribuzione(r.frequenza, r.dataPagamento);
      MESI_KEYS.forEach(k => {
        entry.mesi[k] = parseFloat(((entry.mesi[k] || 0) + (dist[k] || 0)).toFixed(2));
      });
    }
  }
  return map;
}

/* ─── DISTRIBUZIONE MENSILE ─── */
function getMeseIdx(dateStr) {
  if (!dateStr) return 0;
  const month = new Date(dateStr + 'T00:00:00').getMonth();
  const idx   = MESI_JS.indexOf(month);
  return idx >= 0 ? idx : 0;
}

function calcDistribuzione(frequenza, dateStr) {
  const mesi = blankMesi();
  const si   = getMeseIdx(dateStr);
  switch (frequenza) {
    case 'Lezione':    mesi[MESI_KEYS[si]] = 5;  break;
    case 'Metà mese': mesi[MESI_KEYS[si]] = 20; break;
    case 'Mensile':   mesi[MESI_KEYS[si]] = 35; break;
    case 'Trimestrale':
      for (let i = 0; i < 3; i++) {
        if (si + i < 10) {
          const val = i < 2
            ? parseFloat((95 / 3).toFixed(2))
            : parseFloat((95 - 2 * parseFloat((95 / 3).toFixed(2))).toFixed(2));
          mesi[MESI_KEYS[si + i]] = val;
        }
      }
      break;
    case 'Stagionale':
      MESI_KEYS.forEach(m => mesi[m] = 24);
      break;
  }
  return mesi;
}

/* ─── PERIODO ─── */
function getPeriodo(frequenza, dateStr) {
  if (!dateStr) return '';
  const d    = new Date(dateStr + 'T00:00:00');
  const m    = d.getMonth();
  const y    = d.getFullYear();
  const nome = MESI_NOMI[m];
  const cap  = s => s.charAt(0).toUpperCase() + s.slice(1);
  switch (frequenza) {
    case 'Lezione':
    case 'Metà mese':
    case 'Mensile':      return `${cap(nome)} ${y}`;
    case 'Trimestrale': {
      const si   = getMeseIdx(dateStr);
      const ei   = Math.min(si + 2, 9);
      return `${cap(nome)} – ${cap(MESI_NOMI[MESI_JS[ei]])} ${y}`;
    }
    case 'Stagionale': {
      const sy = m >= 8 ? y : y - 1;
      return `Stagionale ${sy}-${String(sy + 1).slice(2)}`;
    }
    default: return '';
  }
}

/* ─── FORMATTAZIONE ─── */
function fmt(n) {
  if (!n || n === 0) return `<span class="cell-empty">—</span>`;
  return `<span class="cell-amount">€${n.toFixed(2).replace('.', ',')}</span>`;
}
function fmtPlain(n) {
  return n > 0 ? `€${n.toFixed(2).replace('.', ',')}` : '—';
}

/* ─── TOGGLE ISCRIZIONE ─── */
function toggleIscrizione(nomeRagazzo) {
  const main   = loadMain();
  const cur    = main.find(r => r.nomeRagazzo === nomeRagazzo);
  const newVal = cur ? !cur.iscrizione : true;
  main.forEach(r => { if (r.nomeRagazzo === nomeRagazzo) r.iscrizione = newVal; });
  saveMain(main);
  renderTable();
}

/* ─── SORT ─── */
function sortBy(key) {
  if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = true; }
  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  const map = { nome: 0, iscrizione: 1, totale: 12 };
  if (map[key] !== undefined) {
    const ths = document.querySelectorAll('thead th');
    if (ths[map[key]]) ths[map[key]].classList.add('sorted');
  }
  renderTable();
}

/* ─── RENDER TABLE ─── */
function renderTable() {
  const search     = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const athleteMap = buildAthleteData();

  let athletes = [...athleteMap.entries()].map(([nome, d]) => ({ nomeRagazzo: nome, ...d }));
  if (search) athletes = athletes.filter(a => a.nomeRagazzo.toLowerCase().includes(search));

  athletes = athletes.map(a => {
    const meseSum = MESI_KEYS.reduce((s, k) => s + (a.mesi[k] || 0), 0);
    const totale  = (a.iscrizione ? ISCRIZIONE_QUOTA : 0) + meseSum;
    return { ...a, meseSum, totale };
  });

  athletes.sort((a, b) => {
    let va, vb;
    if (sortKey === 'nome')            { va = a.nomeRagazzo; vb = b.nomeRagazzo; }
    else if (sortKey === 'totale')     { va = a.totale;      vb = b.totale; }
    else if (sortKey === 'iscrizione') { va = a.iscrizione ? 1 : 0; vb = b.iscrizione ? 1 : 0; }
    else                               { va = a.nomeRagazzo; vb = b.nomeRagazzo; }
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb, 'it') : vb.localeCompare(va, 'it');
    return sortAsc ? va - vb : vb - va;
  });

  document.getElementById('recordCount').textContent = `${athletes.length} atleti`;

  const tbody = document.getElementById('tableBody');
  const tfoot = document.getElementById('tableFoot');
  const empty = document.getElementById('emptyState');

  if (!athletes.length) {
    tbody.innerHTML = '';
    tfoot.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const colTotals   = blankMesi();
  let totIscrizioni = 0, totGrand = 0;

  tbody.innerHTML = athletes.map(({ nomeRagazzo, iscrizione, mesi, totale }) => {
    const iscAmt = iscrizione ? ISCRIZIONE_QUOTA : 0;
    totIscrizioni += iscAmt;
    MESI_KEYS.forEach(k => colTotals[k] += (mesi[k] || 0));
    totGrand += totale;
    return `<tr>
      <td class="col-name" data-label="Atleta">
        <span class="player-name">${escHtml(nomeRagazzo)}</span>
        <button class="btn-edit-athlete" onclick="openAthleteModal('${escHtml(nomeRagazzo)}')" title="Modifica pagamenti">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </td>
      <td data-label="Iscrizione">
        <button class="toggle-iscrizione ${iscrizione ? 'is-paid' : 'is-unpaid'}"
                onclick="toggleIscrizione('${escHtml(nomeRagazzo)}')"
                title="Clicca per cambiare">
          ${iscrizione ? '✓ Pagata' : '✗ Non pagata'}
        </button>
      </td>
      ${MESI_KEYS.map((k, i) => `<td class="cell-mese" data-label="${MESI_SHORT[i]}">${fmt(mesi[k] || 0)}</td>`).join('')}
      <td class="cell-totale" data-label="Totale">${totale > 0 ? `<strong>${fmtPlain(totale)}</strong>` : '<span class="cell-empty">—</span>'}</td>
    </tr>`;
  }).join('');

  tfoot.innerHTML = `<tr class="footer-row">
    <td><strong>Totali</strong></td>
    <td data-label="Iscrizione"><strong>${totIscrizioni > 0 ? fmtPlain(totIscrizioni) : '—'}</strong></td>
    ${MESI_KEYS.map((k, i) => `<td class="cell-mese" data-label="${MESI_SHORT[i]}"><strong>${colTotals[k] > 0 ? fmtPlain(colTotals[k]) : '—'}</strong></td>`).join('')}
    <td class="cell-totale" data-label="Totale"><strong>${fmtPlain(totGrand)}</strong></td>
  </tr>`;
}

/* ─── MODAL ─── */
function openModal() {
  const main  = loadMain();
  const names = [...new Set(main.map(r => r.nomeRagazzo).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'it'));
  const sel   = document.getElementById('f_nomeRagazzo');
  sel.innerHTML = '<option value="">Seleziona atleta…</option>' +
    names.map(n => `<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');

  document.getElementById('payForm').reset();
  document.getElementById('f_dataPagamento').value = new Date().toISOString().slice(0, 10);
  document.getElementById('previewWrap').style.display = 'none';
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('f_nomeRagazzo').focus(), 100);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
}

/* ─── PREVIEW ─── */
function updatePreview() {
  const frequenza = document.getElementById('f_frequenza').value;
  const dateStr   = document.getElementById('f_dataPagamento').value;
  const wrap      = document.getElementById('previewWrap');
  const preview   = document.getElementById('mesiPreview');

  if (!frequenza) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  const dist    = calcDistribuzione(frequenza, dateStr);
  const importo = FREQ_IMPORTO[frequenza];

  preview.innerHTML = MESI_KEYS.map((k, i) => {
    const val = dist[k];
    return `<span class="preview-mese ${val > 0 ? 'active' : ''}">
      <span class="preview-label">${MESI_SHORT[i]}</span>
      <span class="preview-val">${val > 0 ? '€' + val.toFixed(2).replace('.', ',') : '—'}</span>
    </span>`;
  }).join('') + `<div class="preview-total">Totale: <strong>€${importo.toFixed(2).replace('.', ',')}</strong></div>`;
}

/* ─── SALVA PAGAMENTO (unico database) ─── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function savePayment(e) {
  e && e.preventDefault();
  const nomeRagazzo = document.getElementById('f_nomeRagazzo').value;
  const frequenza   = document.getElementById('f_frequenza').value;
  const dateStr     = document.getElementById('f_dataPagamento').value;
  const tipo        = document.getElementById('f_tipoPagamento').value;

  if (!nomeRagazzo) { toast('Seleziona un atleta', 'error'); return; }
  if (!frequenza)   { toast('Seleziona la frequenza', 'error'); return; }

  const main    = loadMain();
  const athlete = main.find(r => r.nomeRagazzo === nomeRagazzo);

  main.unshift({
    id:            uid(),
    nomeRagazzo,
    anno:          athlete?.anno || '',
    nomeGenitore:  athlete?.nomeGenitore || '',
    cfGenitore:    athlete?.cfGenitore || '',
    telefono:      athlete?.telefono || '',
    dataPagamento: dateStr,
    frequenza,
    periodo:       getPeriodo(frequenza, dateStr),
    tipoPagamento: tipo,
    iscrizione:    athlete?.iscrizione || false,
  });
  saveMain(main);

  closeModal();
  renderTable();
  toast(`Pagamento di ${nomeRagazzo} salvato ✓`, 'success');
  openWhatsApp(nomeRagazzo, frequenza, dateStr, tipo, getPeriodo(frequenza, dateStr));
}

function openWhatsApp(nomeRagazzo, frequenza, dateStr, tipo, periodo) {
  const main = loadMain();
  const rec  = main.find(r => r.nomeRagazzo === nomeRagazzo && r.telefono);
  if (!rec) { toast('Nessun numero di telefono registrato per questo atleta', 'error'); return; }
  let phone = rec.telefono.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = phone.slice(1);
  if (!phone.startsWith('39')) phone = '39' + phone;
  const importo  = FREQ_IMPORTO[frequenza];
  const dataFmt  = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT') : '—';
  const genitore = rec.nomeGenitore || 'Genitore';
  const msg =
    `🏀 *Avis Basket Trani*\n\n` +
    `Gentile ${genitore},\n\n` +
    `abbiamo registrato il pagamento per *${nomeRagazzo}*:\n\n` +
    `📅 Data: ${dataFmt}\n` +
    `🔄 Frequenza: ${frequenza}${importo ? ' — €' + importo : ''}\n` +
    `📆 Periodo: ${periodo || '—'}\n` +
    `💳 Tipo: ${tipo || '—'}\n\n` +
    `Grazie per la fiducia! 🏀`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ─── TOAST ─── */
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = '.3s';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/* ─── EXPORT CSV ─── */
function exportCSV() {
  const athleteMap = buildAthleteData();
  const athletes   = [...athleteMap.entries()]
    .map(([nome, d]) => ({ nomeRagazzo: nome, ...d }))
    .sort((a, b) => a.nomeRagazzo.localeCompare(b.nomeRagazzo, 'it'));

  if (!athletes.length) { toast('Nessun dato da esportare', 'error'); return; }

  const header = ['Atleta', 'Iscrizione', ...MESI_SHORT, 'Totale'];
  const rows   = athletes.map(a => {
    const meseSum = MESI_KEYS.reduce((s, k) => s + (a.mesi[k] || 0), 0);
    const totale  = (a.iscrizione ? ISCRIZIONE_QUOTA : 0) + meseSum;
    return [
      a.nomeRagazzo,
      a.iscrizione ? 'Pagata' : 'Non pagata',
      ...MESI_KEYS.map(k => a.mesi[k] > 0 ? a.mesi[k].toFixed(2).replace('.', ',') : '0'),
      totale.toFixed(2).replace('.', ',')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
  });

  const csv = '﻿' + [header.join(';'), ...rows].join('\n');
  const el  = document.createElement('a');
  el.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  el.download = `avis-basket-trani-quote-${new Date().toISOString().slice(0, 10)}.csv`;
  el.click();
  toast(`CSV esportato (${athletes.length} atleti) ✓`, 'success');
}

/* ─── MODAL PAGAMENTI ATLETA ─── */
let _mpNome    = null;
let _epId      = null;
let _confirmId = null;

function openAthleteModal(nome) {
  _mpNome    = nome;
  _epId      = null;
  _confirmId = null;
  document.getElementById('mpNome').textContent = nome;
  _refreshMpCount();
  renderAthletePayments();
  document.getElementById('overlayPagamenti').classList.add('open');
}

function closeAthleteModal() {
  document.getElementById('overlayPagamenti').classList.remove('open');
  _mpNome = _epId = _confirmId = null;
}

function _refreshMpCount() {
  const cnt = loadMain().filter(r => r.nomeRagazzo === _mpNome).length;
  document.getElementById('mpCount').textContent = cnt + (cnt === 1 ? ' pagamento' : ' pagamenti');
}

function renderAthletePayments() {
  const payments = loadMain().filter(r => r.nomeRagazzo === _mpNome);
  const body     = document.getElementById('mpBody');

  if (!payments.length) {
    body.innerHTML = '<p class="mp-empty">Nessun pagamento registrato.</p>';
    return;
  }

  body.innerHTML = payments.map(p => {
    const dataFmt = p.dataPagamento
      ? new Date(p.dataPagamento + 'T00:00:00').toLocaleDateString('it-IT')
      : '—';
    const importo = FREQ_IMPORTO[p.frequenza];

    if (_epId === p.id) {
      return `<div class="mp-item mp-editing">
        <div class="form-grid">
          <div class="form-group">
            <label>Frequenza</label>
            <select id="ep_freq">
              <option value="Lezione"      ${p.frequenza==='Lezione'     ?'selected':''}>Lezione — €5</option>
              <option value="Metà mese"   ${p.frequenza==='Metà mese'  ?'selected':''}>Metà mese — €20</option>
              <option value="Mensile"      ${p.frequenza==='Mensile'     ?'selected':''}>Mensile — €35</option>
              <option value="Trimestrale" ${p.frequenza==='Trimestrale'?'selected':''}>Trimestrale — €95</option>
              <option value="Stagionale"  ${p.frequenza==='Stagionale' ?'selected':''}>Stagionale — €240</option>
            </select>
          </div>
          <div class="form-group">
            <label>Data Pagamento</label>
            <input type="date" id="ep_data" value="${p.dataPagamento || ''}">
          </div>
          <div class="form-group full">
            <label>Tipo di Pagamento</label>
            <select id="ep_tipo">
              <option value=""         ${!p.tipoPagamento          ?'selected':''}>—</option>
              <option value="Contanti" ${p.tipoPagamento==='Contanti'?'selected':''}>Contanti</option>
              <option value="Bonifico" ${p.tipoPagamento==='Bonifico'?'selected':''}>Bonifico</option>
            </select>
          </div>
        </div>
        <div class="mp-edit-btns">
          <button class="btn-cancel" onclick="cancelEditPayment()">Annulla</button>
          <button class="btn-save"   onclick="saveEditPayment('${p.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Salva
          </button>
        </div>
      </div>`;
    }

    if (_confirmId === p.id) {
      return `<div class="mp-item mp-confirm">
        <div class="mp-info">
          <span class="mp-freq">${escHtml(p.frequenza)}${importo ? ` — €${importo}` : ''}</span>
          <span class="mp-detail">${dataFmt} · ${escHtml(p.periodo || '—')}</span>
        </div>
        <div class="mp-confirm-msg">
          <span>Eliminare questo pagamento?</span>
          <div class="mp-confirm-btns">
            <button class="btn-cancel"      onclick="cancelDeletePayment()">Annulla</button>
            <button class="btn-del-confirm" onclick="confirmDeletePayment('${p.id}')">Elimina</button>
          </div>
        </div>
      </div>`;
    }

    return `<div class="mp-item">
      <div class="mp-info">
        <span class="mp-freq">${escHtml(p.frequenza)}${importo ? ` — €${importo}` : ''}</span>
        <span class="mp-detail">${dataFmt} · ${escHtml(p.periodo || '—')} · ${escHtml(p.tipoPagamento || '—')}</span>
      </div>
      <div class="mp-btns">
        <button class="btn-icon btn-edit" onclick="startEditPayment('${p.id}')"    title="Modifica">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-del"  onclick="askDeletePayment('${p.id}')"   title="Elimina">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');
}

function startEditPayment(id) {
  _epId = id; _confirmId = null;
  renderAthletePayments();
}

function cancelEditPayment() {
  _epId = null;
  renderAthletePayments();
}

function saveEditPayment(id) {
  const freq = document.getElementById('ep_freq').value;
  const data = document.getElementById('ep_data').value;
  const tipo = document.getElementById('ep_tipo').value;
  const main = loadMain();
  const idx  = main.findIndex(r => r.id === id);
  if (idx === -1) return;
  main[idx].frequenza     = freq;
  main[idx].dataPagamento = data;
  main[idx].tipoPagamento = tipo;
  main[idx].periodo       = getPeriodo(freq, data);
  saveMain(main);
  _epId = null;
  _refreshMpCount();
  renderAthletePayments();
  renderTable();
  toast('Pagamento aggiornato ✓', 'success');
}

function askDeletePayment(id) {
  _confirmId = id; _epId = null;
  renderAthletePayments();
}

function cancelDeletePayment() {
  _confirmId = null;
  renderAthletePayments();
}

function confirmDeletePayment(id) {
  const main    = loadMain();
  const newMain = main.filter(r => r.id !== id);
  saveMain(newMain);
  _confirmId = null;
  _refreshMpCount();
  renderAthletePayments();
  renderTable();
  toast('Pagamento eliminato', 'success');
}

/* ─── EVENTI ─── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('overlayPagamenti').classList.contains('open')) closeAthleteModal();
  else closeModal();
});
document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) closeModal();
});
document.getElementById('overlayPagamenti').addEventListener('click', e => {
  if (e.target === document.getElementById('overlayPagamenti')) closeAthleteModal();
});

/* ─── INIT ─── */
renderTable();
