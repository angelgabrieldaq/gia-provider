/* ui-helpers.js — Gia · Módulo Obstétrico Inteligente
 * Navegación, breadcrumb y helpers de UI. Sin lógica clínica. */

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
  go("sc-form");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Nueva consulta" }]);
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
  go("sc-nueva");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Nueva paciente" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.add("collapsed");
  goStep(1);
}

function showLaboratorios() {
  go("sc-laboratorios");
  setBB([{ l: "Dashboard", f: "showDash()" }, { l: "Ramírez, Laura", f: "showPatient()" }, { l: "Laboratorios" }]);
  document.querySelectorAll(".pitem").forEach(e => e.classList.remove("active"));
  document.getElementById("si-l").classList.add("active");
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
  btn.closest('.hcharts').querySelectorAll(".hctab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  document.getElementById("hc-bp").style.display    = id === "bp"   ? "block" : "none";
  document.getElementById("hc-peso").style.display  = id === "peso" ? "block" : "none";
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
  btn.closest('.hcharts').querySelectorAll(".hctab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  document.getElementById("rc-bp").style.display    = id === "bp"   ? "block" : "none";
  document.getElementById("rc-peso").style.display  = id === "peso" ? "block" : "none";
  document.getElementById("rc-labo").style.display  = id === "labo" ? "block" : "none";
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
