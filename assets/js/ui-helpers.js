/* ui-helpers.js — Gia · Módulo Obstétrico Inteligente
 * Navegación, breadcrumb y helpers de UI. Sin lógica clínica. */

/* ── STATE RESET — previene contaminación entre sesiones ─────────────────────*/
function clearAllForms() {
  document.querySelectorAll(".main input, .main select, .main textarea").forEach(el => {
    if (el.type === "checkbox" || el.type === "radio") {
      el.checked = false;
    } else {
      el.value = "";
    }
    el.classList.remove("fok", "ferr");
  });
  document.querySelectorAll(".main .fhint").forEach(h => { h.textContent = ""; h.className = "fhint"; });
}

/* ── AUTOSAVE DRAFT — LocalStorage anti-interrupciones ──────────────────────
 * Guarda el estado del formulario activo en cada input/change.
 * Nota de seguridad: LocalStorage no está cifrado. En Sprint 2, el backend
 * reemplaza este mecanismo y se elimina el draft de LS al iniciar sesión.
 */
const _DRAFT_KEYS = {
  'sc-nueva':        'gia_draft_nueva',
  'sc-form':         'gia_draft_consulta',
  'sc-laboratorios': 'gia_draft_labs',
};

function _activeDraftKey() {
  const active = document.querySelector('.screen.active');
  return active ? (_DRAFT_KEYS[active.id] || null) : null;
}

function saveDraft() {
  const key    = _activeDraftKey();
  if (!key) return;
  const screen = document.querySelector('.screen.active');
  const data   = {};
  screen.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    data[el.id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
  });
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
}

function clearDraft(screenId) {
  const key = _DRAFT_KEYS[screenId];
  if (key) localStorage.removeItem(key);
}

function _restoreAndNotify(screenId) {
  const key = _DRAFT_KEYS[screenId];
  if (!key) return;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (!Object.keys(data).length) return;
    let restored = 0;
    Object.entries(data).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') { el.checked = val; }
      else { el.value = val; }
      restored++;
    });
    if (restored > 0) _showToast('Borrador recuperado');
  } catch (_) {}
}

/* Programmatic assignment (el.value = '') no dispara input/change en el spec
 * HTML5 — saveDraft() nunca se invoca durante clearAllForms() ni durante
 * _restoreAndNotify(). Este listener es seguro sin flags adicionales. */
document.addEventListener('input',  saveDraft, { passive: true });
document.addEventListener('change', saveDraft, { passive: true });

/* ── CANCEL WRAPPERS — limpian draft además de navegar ───────────────────────*/
function cancelNueva()    { clearAllForms(); clearDraft('sc-nueva');        showDash();    }
function cancelConsulta() { clearAllForms(); clearDraft('sc-form');         showPatient(); }
function cancelLaboratorios() { clearAllForms(); clearDraft('sc-laboratorios'); showPatient(); }

/* ── TOAST VISUAL ────────────────────────────────────────────────────────────*/
function _showToast(msg) {
  let t = document.getElementById('gia-toast');
  if (!t) {
    t = document.createElement('div');
    t.id        = 'gia-toast';
    t.className = 'gia-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.remove('show');
  /* doble rAF garantiza que el browser procese el remove antes del add */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }));
}

/* ── AUTO-FOCUS — primer campo visible del formulario ────────────────────────*/
function _autoFocusFirst(screenId) {
  /* setTimeout(60): espera a que go() + goStep() terminen de actualizar el DOM */
  setTimeout(() => {
    const screen = document.getElementById(screenId);
    if (!screen) return;
    const first = screen.querySelector(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([disabled]), select:not([disabled])'
    );
    if (first && first.offsetParent !== null) first.focus();
  }, 60);
}

/* ── ENTER-TO-NEXT — navegación a dos manos sin mouse ───────────────────────
 * Avanza al siguiente campo interactivo visible al presionar Enter.
 * - textarea: comportamiento nativo (salto de línea), no se intercepta.
 * - checkbox/radio: avanza el foco; Space sigue toggling nativamente.
 * - select: avanza (la selección de opciones usa las flechas del teclado).
 */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  const el = e.target;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON') return;
  if (!el.matches('input, select')) return;

  const screen = document.querySelector('.screen.active');
  if (!screen) return;

  const focusable = Array.from(screen.querySelectorAll(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
  )).filter(node => node.offsetParent !== null);

  const idx = focusable.indexOf(el);
  if (idx >= 0 && idx < focusable.length - 1) {
    e.preventDefault();
    focusable[idx + 1].focus();
  }
});

/* ── NAVEGACIÓN ──────────────────────────────────────────────────────────────*/
function go(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  const contentPanel = document.querySelector(".main");
  const panelBody    = document.querySelector(".np-nueva-body");
  if (contentPanel) contentPanel.scrollTop = 0;
  if (panelBody)    panelBody.scrollTop    = 0;
  window.scrollTo(0, 0);
}

function setBB(p) {
  document.getElementById("bbar").innerHTML = p.map((x, i) =>
    i < p.length - 1
      ? `<button class="bc" onclick="${x.f || ''}">${x.l}</button><span class="bc-sep">›</span>`
      : `<span class="bc-act">${x.l}</span>`
  ).join("");
}

function showDash() {
  go("sc-dash");
  setBB([{ l: "Dashboard" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("collapsed");
}

function showPatient() {
  go("sc-patient");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  document.getElementById("si-l").classList.add("active");
}

function showForm() {
  clearAllForms();
  go("sc-form");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Nueva consulta" }]);
  _restoreAndNotify('sc-form');
  _autoFocusFirst('sc-form');
}

function showModal() {
  go("sc-modal");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Alerta crítica" }]);
}

function showHistory() {
  go("sc-history");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Historial clínico" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  document.getElementById("si-l").classList.add("active");
}

function showNueva() {
  clearAllForms();
  go("sc-nueva");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Nueva paciente" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.add("collapsed");
  goStep(1);
  _restoreAndNotify('sc-nueva');
  _autoFocusFirst('sc-nueva');
}

function showLaboratorios() {
  clearAllForms();
  go("sc-laboratorios");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Laboratorios" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  document.getElementById("si-l").classList.add("active");
  _restoreAndNotify('sc-laboratorios');
  _autoFocusFirst('sc-laboratorios');
}

/* ── TABS DE LABORATORIO ─────────────────────────────────────────────────────*/
function showLabo(n) {
  document.querySelectorAll(".labo-tab").forEach(t => t.classList.remove("on"));
  document.querySelectorAll(".labo-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("ltab-" + n).classList.add("on");
  document.getElementById("lp-" + n).classList.add("active");
}

/* ── COLAPSABLES GENÉRICOS ───────────────────────────────────────────────────*/
function togTier(btn) {
  const body = btn.nextElementSibling;
  const open = body.classList.toggle("open");
  const arrow = btn.querySelector(".coll-arrow");
  if (arrow) arrow.textContent = open ? "▲" : "▼";
}

function togB(btn) {
  const b = document.getElementById("tb");
  b.classList.toggle("open");
  btn.querySelector("span:last-child").textContent = b.classList.contains("open") ? "Colapsar ▲" : "Expandir ▼";
}

/* ── SÍNTOMAS — Ninguno deselecciona los demás ───────────────────────────────*/
function togSintomasNinguno(cb) {
  if (!cb.checked) return;
  ['f-cefalea','f-escotomas-dest','f-escotomas-manch','f-epigastralgia','f-zumbido','f-eclampsia'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
}

/* ── HÁBITOS — toggle individual ─────────────────────────────────────────────*/
function togHabit(cb, detailId) {
  const el = document.getElementById(detailId);
  if (el) el.style.display = cb.checked ? "block" : "none";
}

/* ── VACUNAS — toggle fecha ──────────────────────────────────────────────────*/
function togVacDate(cb, dateId) {
  const el = document.getElementById(dateId);
  if (el) el.style.display = cb.checked ? "flex" : "none";
}

/* ── PREVENTIVOS — toggle detalle de estudio ─────────────────────────────────*/
function togMamEstudio(cb) {
  const el = cb.closest(".prev-row").querySelector(".prev-detail");
  if (el) el.style.display = cb.checked ? "block" : "none";
}

function togPapEstudio(cb) {
  const el = cb.closest(".prev-row").querySelector(".prev-detail");
  if (el) el.style.display = cb.checked ? "block" : "none";
}

/* ── HISTORY TIMELINE ────────────────────────────────────────────────────────*/
function togH(top) {
  const body = top.nextElementSibling;
  const exp  = top.querySelector(".hexp");
  const open = body.classList.toggle("open");
  exp.classList.toggle("open", open);
}

function filterHist(btn, f) {
  document.querySelectorAll(".htab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  const semMap = { t1: [12, 19], t2: [20, 27], t3: [28, 42] };
  const entries = document.querySelectorAll("#hist-tl .hentry");
  let vis = 0;
  let lastVisibleEntry = null;
  entries.forEach(e => {
    e.classList.remove("last-visible");
    const st  = e.dataset.status;
    const sem = +e.dataset.sem;
    let show  = true;
    if      (f === "alert") show = (st === "c" || st === "a");
    else if (f === "t1")    show = sem >= semMap.t1[0] && sem <= semMap.t1[1];
    else if (f === "t2")    show = sem >= semMap.t2[0] && sem <= semMap.t2[1];
    else if (f === "t3")    show = sem >= semMap.t3[0] && sem <= semMap.t3[1];
    e.style.display = show ? "flex" : "none";
    if (show) { vis++; lastVisibleEntry = e; }
  });
  if (lastVisibleEntry) lastVisibleEntry.classList.add("last-visible");
  document.getElementById("hist-empty").classList.toggle("show", vis === 0);
}

/* ── CHARTS ──────────────────────────────────────────────────────────────────*/
function switchChart(btn, id) {
  const container = btn.closest('.hcharts');
  container.querySelectorAll(".hctab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  container.querySelectorAll(".hchart-wrap").forEach(p => p.style.display = "none");
  const target = container.querySelector('[data-chart="' + id + '"]');
  if (target) target.style.display = "block";
}

/* ── MODAL / CONSULTA ────────────────────────────────────────────────────────*/
function selC(el) {
  document.querySelectorAll(".copt").forEach(o => o.classList.remove("sel"));
  el.classList.add("sel");
}

/* ── SPEC v3.0 — CONSULTA ────────────────────────────────────────────────────*/

function togMed(name) {
  const cb  = document.getElementById("mc-" + name);
  const det = document.getElementById("med-" + name + "-det");
  if (det) det.style.display = cb.checked ? "flex" : "none";
}

function selEstado(label) {
  document.querySelectorAll(".estado-opt").forEach(l => l.classList.remove("sel"));
  label.classList.add("sel");
  label.querySelector("input").checked = true;
}

function togCierre(label) {
  label.classList.toggle("sel");
  const cb = label.querySelector("input");
  if (cb) cb.checked = label.classList.contains("sel");
}

function switchResumenChart(btn, id) {
  const container = btn.closest('.hcharts');
  container.querySelectorAll(".hctab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  container.querySelectorAll(".hchart-wrap").forEach(p => p.style.display = "none");
  const target = container.querySelector('[data-chart="' + id + '"]');
  if (target) target.style.display = "block";
}

/* ── FORMULARIO EN PASOS — spec v4.0 ─────────────────────────────────────────*/
let currentStep = 1;
const TOTAL_STEPS = 4;

function goStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  currentStep = n;
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl  = document.getElementById("np-step-"  + i);
    const panelEl = document.getElementById("np-panel-" + i);
    if (!stepEl || !panelEl) continue;
    stepEl.classList.remove("active", "done");
    panelEl.classList.remove("active");
    if (i < n)  stepEl.classList.add("done");
    if (i === n) { stepEl.classList.add("active"); panelEl.classList.add("active"); }
  }
  const prev = document.getElementById("np-btn-prev");
  const next = document.getElementById("np-btn-next");
  if (prev) prev.style.visibility = n === 1 ? "hidden" : "visible";
  if (next) {
    if (n === TOTAL_STEPS) {
      next.textContent = "Guardar paciente";
      next.onclick = () => savePatient();
    } else {
      next.textContent = "Siguiente →";
      next.onclick = () => goStep(currentStep + 1);
    }
  }
  const body = document.querySelector(".np-nueva-body");
  if (body) body.scrollTop = 0;
}
