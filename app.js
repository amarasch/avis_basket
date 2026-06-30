/* ─── DATA ─── */
let records = JSON.parse(localStorage.getItem('avisBasketPagamenti') || '[]');
let editingId = null;
let deletingId = null;
let inlineEditingId = null;
let sortKey = 'cognome';
let sortAsc = true;

function save() {
  localStorage.setItem('avisBasketPagamenti', JSON.stringify(records));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ─── TABLE ─── */
function getFiltered() {
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const freq   = document.getElementById('filterFreq').value;
  const tipo   = document.getElementById('filterTipo').value;

  return records.filter(r => {
    const matchSearch = !search ||
      (r.cognome || '').toLowerCase().includes(search) ||
      (r.nome || '').toLowerCase().includes(search) ||
      (r.gruppo || '').toLowerCase().includes(search) ||
      (r.nomeGenitore || '').toLowerCase().includes(search) ||
      (r.cfGenitore || '').toLowerCase().includes(search) ||
      (r.periodo || '').toLowerCase().includes(search);
    const matchFreq = !freq || r.frequenza === freq;
    const matchTipo = !tipo || r.tipoPagamento === tipo;
    return matchSearch && matchFreq && matchTipo;
  }).sort((a, b) => {
    let va = a[sortKey] || '', vb = b[sortKey] || '';
    if (sortKey === 'anno') { va = +va; vb = +vb; }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ?  1 : -1;
    return 0;
  });
}

const FREQ_OPTIONS   = ['Lezione', 'Metà mese', 'Mensile', 'Trimestrale', 'Stagionale'];
const TIPO_OPTIONS   = ['Contanti', 'Bonifico'];
const GRUPPO_OPTIONS = ['Pulcini', 'Scoiattoli', 'Aquilotti', 'U13', 'U14', 'U15'];

const freqClass = { Lezione: 'lezione', 'Metà mese': 'meta-mese', Mensile: 'mensile', Trimestrale: 'trimestrale', Stagionale: 'stagionale' };
const tipoClass = { Contanti: 'contanti', Bonifico: 'bonifico' };

function normalRow(r) {
  const dataFmt = r.dataPagamento ? new Date(r.dataPagamento + 'T00:00:00').toLocaleDateString('it-IT') : '—';
  const fc   = freqClass[r.frequenza] || '';
  const tc   = tipoClass[r.tipoPagamento] || '';
  const gc   = r.gruppo ? r.gruppo.toLowerCase() : '';
  const iscr = r.iscrizione;
  const tel  = r.telefono
    ? `<a class="tel-link" href="tel:${escHtml(r.telefono)}">${escHtml(r.telefono)}</a>`
    : '—';
  return `<tr data-id="${r.id}">
    <td data-label="Cognome"><span class="player-name">${escHtml(r.cognome || '—')}</span></td>
    <td data-label="Nome">${escHtml(r.nome || '—')}</td>
    <td data-label="Gruppo">${gc ? `<span class="badge badge-gruppo-${gc}">${escHtml(r.gruppo)}</span>` : '—'}</td>
    <td data-label="Anno">${escHtml(String(r.anno || '—'))}</td>
    <td data-label="Genitore">${escHtml(r.nomeGenitore || '—')}</td>
    <td data-label="Cod. Fiscale"><code class="cf-code">${escHtml(r.cfGenitore || '—')}</code></td>
    <td data-label="Telefono">${tel}</td>
    <td data-label="Data">${dataFmt}</td>
    <td data-label="Frequenza">${fc ? `<span class="badge badge-${fc}">${escHtml(r.frequenza)}</span>` : '—'}</td>
    <td data-label="Periodo">${escHtml(r.periodo || '—')}</td>
    <td data-label="Tipo">${tc ? `<span class="badge badge-${tc}">${escHtml(r.tipoPagamento)}</span>` : '—'}</td>
    <td data-label="Iscrizione">
      <button class="toggle-iscrizione ${iscr ? 'is-paid' : 'is-unpaid'}" onclick="toggleIscrizione('${r.id}')" title="Clicca per cambiare">
        ${iscr ? '✓ Pagata' : '✗ Non pagata'}
      </button>
    </td>
    <td data-label=""><div class="actions">
      <button class="btn-icon btn-edit" onclick="startInlineEdit('${r.id}')" title="Modifica">✏️</button>
      <button class="btn-icon btn-del"  onclick="askDelete('${r.id}')" title="Elimina">🗑️</button>
    </div></td>
  </tr>`;
}

function inlineRow(r) {
  const freqOpts   = FREQ_OPTIONS.map(o =>
    `<option value="${o}" ${r.frequenza === o ? 'selected' : ''}>${o}</option>`
  ).join('');
  const tipoOpts   = TIPO_OPTIONS.map(o =>
    `<option value="${o}" ${r.tipoPagamento === o ? 'selected' : ''}>${o}</option>`
  ).join('');
  const gruppoOpts = GRUPPO_OPTIONS.map(o =>
    `<option value="${o}" ${r.gruppo === o ? 'selected' : ''}>${o}</option>`
  ).join('');

  return `<tr class="row-editing" data-id="${r.id}">
    <td><input class="inline-input" id="ie_cognome" value="${escHtml(r.cognome || '')}" placeholder="Cognome"></td>
    <td><input class="inline-input" id="ie_nome" value="${escHtml(r.nome || '')}" placeholder="Nome"></td>
    <td><select class="inline-select" id="ie_gruppo"><option value="">—</option>${gruppoOpts}</select></td>
    <td><input class="inline-input inline-short" id="ie_anno" type="number" value="${r.anno || ''}" min="2000" max="2099" placeholder="Anno"></td>
    <td><input class="inline-input" id="ie_nomeGenitore" value="${escHtml(r.nomeGenitore || '')}" placeholder="Nome genitore"></td>
    <td><input class="inline-input inline-cf" id="ie_cfGenitore" value="${escHtml(r.cfGenitore || '')}" maxlength="16" placeholder="Codice fiscale" oninput="this.value=this.value.toUpperCase()"></td>
    <td><input class="inline-input inline-phone" id="ie_telefono" type="tel" value="${escHtml(r.telefono || '')}" placeholder="Telefono"></td>
    <td><input class="inline-input inline-date" id="ie_dataPagamento" type="date" value="${r.dataPagamento || ''}"></td>
    <td><select class="inline-select" id="ie_frequenza">
      <option value="">—</option>${freqOpts}
    </select></td>
    <td><input class="inline-input" id="ie_periodo" value="${escHtml(r.periodo || '')}" placeholder="Periodo"></td>
    <td><select class="inline-select" id="ie_tipoPagamento">
      <option value="">—</option>${tipoOpts}
    </select></td>
    <td>
      <label class="inline-toggle-wrap">
        <input type="checkbox" id="ie_iscrizione" ${r.iscrizione ? 'checked' : ''}>
        <span class="inline-toggle-label">Pagata</span>
      </label>
    </td>
    <td><div class="actions">
      <button class="btn-icon btn-save-inline" onclick="saveInline('${r.id}')" title="Salva">✔</button>
      <button class="btn-icon btn-cancel-inline" onclick="cancelInline()" title="Annulla">✕</button>
    </div></td>
  </tr>`;
}

function renderTable() {
  const data  = getFiltered();
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  document.getElementById('recordCount').textContent = `${data.length} record`;

  if (!data.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    inlineEditingId = null;
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(r =>
    r.id === inlineEditingId ? inlineRow(r) : normalRow(r)
  ).join('');

  if (inlineEditingId) {
    const first = document.getElementById('ie_nomeRagazzo');
    if (first) first.focus();
  }
}

function startInlineEdit(id) {
  inlineEditingId = id;
  const wrap = document.querySelector('.table-responsive');
  if (wrap) wrap.classList.add('is-editing-mode');
  renderTable();
}

function saveInline(id) {
  const get = elId => {
    const el = document.getElementById(elId);
    return el ? el.value.trim() : '';
  };

  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return;

  const nome    = get('ie_nome');
  const cognome = get('ie_cognome');
  const iscEl   = document.getElementById('ie_iscrizione');
  records[idx] = {
    ...records[idx],
    nome,
    cognome,
    nomeRagazzo:   [nome, cognome].filter(Boolean).join(' '),
    gruppo:        get('ie_gruppo'),
    anno:          get('ie_anno'),
    nomeGenitore:  get('ie_nomeGenitore'),
    cfGenitore:    get('ie_cfGenitore').toUpperCase(),
    telefono:      get('ie_telefono'),
    dataPagamento: get('ie_dataPagamento'),
    frequenza:     get('ie_frequenza'),
    periodo:       get('ie_periodo'),
    tipoPagamento: get('ie_tipoPagamento'),
    iscrizione:    iscEl ? iscEl.checked : records[idx].iscrizione,
  };

  inlineEditingId = null;
  const wrap = document.querySelector('.table-responsive');
  if (wrap) wrap.classList.remove('is-editing-mode');
  save();
  renderTable();
  toast('Pagamento aggiornato ✓', 'success');
}

function cancelInline() {
  inlineEditingId = null;
  const wrap = document.querySelector('.table-responsive');
  if (wrap) wrap.classList.remove('is-editing-mode');
  renderTable();
}

function toggleIscrizione(id) {
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return;
  records[idx].iscrizione = !records[idx].iscrizione;
  save();
  renderTable();
}

function sortBy(key) {
  if (inlineEditingId) cancelInline();
  if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = true; }
  document.querySelectorAll('thead th').forEach(th => th.classList.remove('sorted'));
  const colIdx = { cognome: 0, nome: 1, gruppo: 2, anno: 3, nomeGenitore: 4, dataPagamento: 7, frequenza: 8, tipoPagamento: 10, iscrizione: 11 };
  const ths = document.querySelectorAll('thead th');
  if (colIdx[key] !== undefined && ths[colIdx[key]]) ths[colIdx[key]].classList.add('sorted');
  renderTable();
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── MODAL (solo per nuovo pagamento) ─── */
function openModal() {
  editingId = null;
  document.getElementById('payForm').reset();
  document.getElementById('f_anno').value          = new Date().getFullYear();
  document.getElementById('f_dataPagamento').value = new Date().toISOString().slice(0, 10);
  document.getElementById('overlay').classList.add('open');
  setTimeout(() => document.getElementById('f_nome').focus(), 100);
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
}

function saveRecord(e) {
  e && e.preventDefault();
  const get = id => document.getElementById(id).value.trim();

  const nome    = get('f_nome');
  const cognome = get('f_cognome');
  const record = {
    id:            uid(),
    nome,
    cognome,
    nomeRagazzo:   [nome, cognome].filter(Boolean).join(' '),
    gruppo:        get('f_gruppo'),
    anno:          get('f_anno'),
    nomeGenitore:  get('f_nomeGenitore'),
    cfGenitore:    get('f_cfGenitore').toUpperCase(),
    telefono:      get('f_telefono'),
    dataPagamento: get('f_dataPagamento'),
    frequenza:     get('f_frequenza'),
    periodo:       get('f_periodo'),
    tipoPagamento: get('f_tipoPagamento'),
    iscrizione:    document.getElementById('f_iscrizione').checked,
  };

  records.unshift(record);
  save();
  renderTable();
  closeModal();
  toast('Pagamento salvato ✓', 'success');
  sendWhatsApp(record);
}

function sendWhatsApp(record) {
  if (!record.telefono) return;
  let phone = record.telefono.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = phone.slice(1);
  if (!phone.startsWith('39')) phone = '39' + phone;
  const IMPORTI = { Lezione: 5, 'Metà mese': 20, Mensile: 35, Trimestrale: 95, Stagionale: 240 };
  const importo = IMPORTI[record.frequenza];
  const dataFmt = record.dataPagamento
    ? new Date(record.dataPagamento + 'T00:00:00').toLocaleDateString('it-IT') : '—';
  const msg =
    `🏀 *Avis Basket Trani*\n\n` +
    `Gentile ${record.nomeGenitore || 'Genitore'},\n\n` +
    `abbiamo registrato il pagamento per *${record.nomeRagazzo}*:\n\n` +
    `📅 Data: ${dataFmt}\n` +
    `🔄 Frequenza: ${record.frequenza}${importo ? ' — €' + importo : ''}\n` +
    `📆 Periodo: ${record.periodo || '—'}\n` +
    `💳 Tipo: ${record.tipoPagamento || '—'}\n` +
    `✅ Iscrizione: ${record.iscrizione ? 'Pagata' : 'Non pagata'}\n\n` +
    `Grazie per la fiducia! 🏀`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ─── DELETE ─── */
function askDelete(id) {
  deletingId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  deletingId = null;
}

function confirmDelete() {
  records = records.filter(r => r.id !== deletingId);
  if (inlineEditingId === deletingId) inlineEditingId = null;
  save();
  renderTable();
  closeConfirm();
  toast('Pagamento eliminato', 'error');
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
  const data = getFiltered();
  if (!data.length) { toast('Nessun dato da esportare', 'error'); return; }
  const header = ['Cognome', 'Nome', 'Gruppo', 'Anno', 'Nome Genitore', 'CF Genitore', 'Telefono', 'Data Pagamento', 'Frequenza', 'Periodo di Riferimento', 'Tipo di Pagamento', 'Iscrizione'];
  const rows = data.map(r => [
    r.cognome || '', r.nome || '', r.gruppo || '', r.anno,
    r.nomeGenitore, r.cfGenitore, r.telefono || '',
    r.dataPagamento, r.frequenza, r.periodo, r.tipoPagamento,
    r.iscrizione ? 'Pagata' : 'Non pagata'
  ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';'));
  const csv = '﻿' + [header.join(';'), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `avis-basket-trani-pagamenti-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  toast(`CSV esportato (${data.length} record) ✓`, 'success');
}

/* ─── EVENTS ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (inlineEditingId) { cancelInline(); return; }
    closeModal();
    closeConfirm();
  }
  if (e.key === 'Enter' && inlineEditingId) {
    saveInline(inlineEditingId);
  }
});

document.getElementById('overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('overlay')) closeModal();
});

document.getElementById('f_cfGenitore').addEventListener('input', function () {
  this.value = this.value.toUpperCase();
});

/* ─── SEED DATA (solo se localStorage è vuoto) ─── */
function seedData() {
  if (records.length > 0) return;
  records = [
  {id:"seed000",nomeRagazzo:"Aurora Accardo",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed001",nomeRagazzo:"Fabio Acquaviva",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed002",nomeRagazzo:"Simone Acquaviva",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed003",nomeRagazzo:"Youssef Alauoi Harouni",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed004",nomeRagazzo:"Alba Alloggio",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed005",nomeRagazzo:"Mauro Amato",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed006",nomeRagazzo:"Mauro Amoruso",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed007",nomeRagazzo:"Andrea Annacondia",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed008",nomeRagazzo:"Gabriele Arpone",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed009",nomeRagazzo:"Cristian Arpone",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed010",nomeRagazzo:"Nicola Baldassarre",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed011",nomeRagazzo:"Andrea Basso",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed012",nomeRagazzo:"Thomas Basta",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed013",nomeRagazzo:"Francesco Borgia",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed014",nomeRagazzo:"Domenico Botta",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed015",nomeRagazzo:"Nicole Caio",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed016",nomeRagazzo:"Gianpaolo Calefato",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed017",nomeRagazzo:"Matteo Capogrosso",anno:"2022",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed018",nomeRagazzo:"Giulia Caputo",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed019",nomeRagazzo:"Mia Caputo",anno:"2016",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed020",nomeRagazzo:"Leonardo Carella",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed021",nomeRagazzo:"Domenico Casieri",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed022",nomeRagazzo:"Umberto Casieri",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed023",nomeRagazzo:"Gabriele Catino",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed024",nomeRagazzo:"Leonardo Cellamare",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed025",nomeRagazzo:"Luca Cifaratti",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed026",nomeRagazzo:"Marco Conca",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed027",nomeRagazzo:"Andrea Coratella",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed028",nomeRagazzo:"Marco Teruo Cupelloni",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed029",nomeRagazzo:"Daniele Curatella",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed030",nomeRagazzo:"Francesco Curci",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed031",nomeRagazzo:"Francesco Saul Curci",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed032",nomeRagazzo:"Gabriele D'addato",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed033",nomeRagazzo:"Leonardo Dagnello",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed034",nomeRagazzo:"Antonio Daleno",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed035",nomeRagazzo:"Francesco De Francesco",anno:"2015",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed036",nomeRagazzo:"Adriano De Palma",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed037",nomeRagazzo:"Francesco De Rosa",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed038",nomeRagazzo:"Mattia Maria De Simone",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed039",nomeRagazzo:"Giorgio Del Rosso",anno:"2016",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed040",nomeRagazzo:"Daniele Di Cugno",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed041",nomeRagazzo:"Daniele Di Cugno",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed042",nomeRagazzo:"Francesco Di Feo",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed043",nomeRagazzo:"Sergio Nunzio Di Giulio",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed044",nomeRagazzo:"Michele Di Leo",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed045",nomeRagazzo:"Federico Di Terlizzi",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed046",nomeRagazzo:"Francesco Fabiano",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed047",nomeRagazzo:"Leonardo Fabiano",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed048",nomeRagazzo:"Francesco Ferrante",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed049",nomeRagazzo:"Francesco Fiore",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed050",nomeRagazzo:"Giovanni Francavilla",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed051",nomeRagazzo:"Federico Fusco",anno:"2016",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed052",nomeRagazzo:"Emanuele Giordano",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed053",nomeRagazzo:"Gabriele Gissi",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed054",nomeRagazzo:"Andrea Laforgia",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed055",nomeRagazzo:"Andrea Lanotte",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed056",nomeRagazzo:"Diego Laudo",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed057",nomeRagazzo:"Sara Laudo",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed058",nomeRagazzo:"Andrea Leone",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed059",nomeRagazzo:"Nisan Leone",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed060",nomeRagazzo:"Gabriele Lettini",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed061",nomeRagazzo:"Lorenzo Lettini",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed062",nomeRagazzo:"Aurora Lettini",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed063",nomeRagazzo:"Nicolò Lettini",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed064",nomeRagazzo:"Alessandro Loddo",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed065",nomeRagazzo:"Denise Loprieno",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed066",nomeRagazzo:"Daniele Lorusso",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed067",nomeRagazzo:"Giorgio Lorusso",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed068",nomeRagazzo:"Giuseppe Lorusso",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed069",nomeRagazzo:"Nicola Lorusso",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed070",nomeRagazzo:"Simone Lorusso",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed071",nomeRagazzo:"Jacopo Marzocca",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed072",nomeRagazzo:"Liam Marzocca",anno:"2022",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed073",nomeRagazzo:"Paolo Mastroianni",anno:"2015",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed074",nomeRagazzo:"Michele Muciaccia",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed075",nomeRagazzo:"Mattia Notarpietro",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed076",nomeRagazzo:"Lorenzo Nugnes",anno:"2015",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed077",nomeRagazzo:"Elio Palmieri",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed078",nomeRagazzo:"Elisabetta Pantaleo",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed079",nomeRagazzo:"Gabriele Pappalettera",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed080",nomeRagazzo:"Tommaso Parisi",anno:"2016",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed081",nomeRagazzo:"Alessandro Pascalone",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed082",nomeRagazzo:"Dario Pellegrino",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed083",nomeRagazzo:"Domenico Pellegrino",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed084",nomeRagazzo:"Samuele Perfetto",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed085",nomeRagazzo:"Nicholas Piumella",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed086",nomeRagazzo:"Nicola Quercia",anno:"2015",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed087",nomeRagazzo:"Giosuè Ragno",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed088",nomeRagazzo:"Chiara Rinaldi",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed089",nomeRagazzo:"Claudia Rinaldi",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed090",nomeRagazzo:"Vito Romanelli",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed091",nomeRagazzo:"Flavio Saraci",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed092",nomeRagazzo:"Paride Savoiardo",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed093",nomeRagazzo:"Fransisco Scoccimarro Ennis",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed094",nomeRagazzo:"Michele Senzio-Savino",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed095",nomeRagazzo:"Giulia Serino",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed096",nomeRagazzo:"Andrea Sgroni",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed097",nomeRagazzo:"Jordan Stringari",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed098",nomeRagazzo:"Antonio Tondolo",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed099",nomeRagazzo:"Giovanna Tondolo",anno:"2018",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed100",nomeRagazzo:"Michele Triglione",anno:"2021",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed101",nomeRagazzo:"Giorgio Vaccanio",anno:"2017",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed102",nomeRagazzo:"Angelica Valenziano",anno:"2014",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed103",nomeRagazzo:"Luigi Vania",anno:"2020",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed104",nomeRagazzo:"Alessandro Ventura",anno:"2012",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed105",nomeRagazzo:"Jacopo Vesce",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed106",nomeRagazzo:"Gabriele Vitofrancesco",anno:"2013",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed107",nomeRagazzo:"Leonardo Zingaro",anno:"2019",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false},
  {id:"seed108",nomeRagazzo:"Diana Zitoli",anno:"2015",nomeGenitore:"",cfGenitore:"",dataPagamento:"",frequenza:"",periodo:"",tipoPagamento:"",iscrizione:false}
  ];
  save();
}

/* ─── MIGRAZIONE DATI ESISTENTI ─── */
function migrateRecords() {
  let changed = false;
  records = records.map(r => {
    if ((!r.nome || !r.cognome) && r.nomeRagazzo) {
      const parts  = (r.nomeRagazzo || '').trim().split(/\s+/);
      if (!r.nome)    { r.nome    = parts.shift() || ''; changed = true; }
      else              parts.shift();
      if (!r.cognome) { r.cognome = parts.join(' ');     changed = true; }
    }
    if (!('gruppo' in r)) { r.gruppo = ''; changed = true; }
    return r;
  });
  if (changed) save();
}

/* ─── RIPRISTINO ATLETI MANCANTI ─── */
function patchMissingAthletes() {
  const REQUIRED = [
    { id: 'seed004', nome: 'Alba',       cognome: 'Alloggio',  nomeRagazzo: 'Alba Alloggio',       anno: '2021' },
    { id: 'seed074', nome: 'Michele',    cognome: 'Muciaccia', nomeRagazzo: 'Michele Muciaccia',    anno: '2012' },
    { id: 'seed081', nome: 'Alessandro', cognome: 'Pascalone', nomeRagazzo: 'Alessandro Pascalone', anno: '2012' },
  ];
  let changed = false;
  for (const a of REQUIRED) {
    const exists = records.some(r =>
      r.nomeRagazzo === a.nomeRagazzo ||
      (r.nome === a.nome && r.cognome === a.cognome)
    );
    if (!exists) {
      records.push({
        id: a.id,
        nome: a.nome, cognome: a.cognome, nomeRagazzo: a.nomeRagazzo,
        anno: a.anno, gruppo: '',
        nomeGenitore: '', cfGenitore: '', telefono: '',
        dataPagamento: '', frequenza: '', periodo: '', tipoPagamento: '',
        iscrizione: false,
      });
      changed = true;
    }
  }
  if (changed) save();
}

/* ─── INIT ─── */
seedData();
migrateRecords();
patchMissingAthletes();
renderTable();
