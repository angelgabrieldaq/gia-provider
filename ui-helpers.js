/* ui-helpers.js — Gia · Módulo Obstétrico Inteligente
 * Navegación, breadcrumb y helpers de UI. Sin lógica clínica. */

/* ── NAVEGACIÓN ──────────────────────────────────────────────────────────────*/
function go(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
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

function togNP(btn) {
  const b = document.getElementById("tb-np");
  b.classList.toggle("open");
  btn.querySelector("span:last-child").textContent = b.classList.contains("open") ? "Colapsar ▲" : "Expandir ▼";
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

/* ── MAMOGRAFÍA — toggle estudio ─────────────────────────────────────────────*/
function togMamEstudio(cb) {
  const el = document.getElementById("mam-estudio-det");
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
  entries.forEach(e => {
    const st  = e.dataset.status;
    const sem = +e.dataset.sem;
    let show  = true;
    if      (f === "alert") show = (st === "c" || st === "a");
    else if (f === "t1")    show = sem >= semMap.t1[0] && sem <= semMap.t1[1];
    else if (f === "t2")    show = sem >= semMap.t2[0] && sem <= semMap.t2[1];
    else if (f === "t3")    show = sem >= semMap.t3[0] && sem <= semMap.t3[1];
    e.style.display = show ? "flex" : "none";
    if (show) vis++;
  });
  document.getElementById("hist-empty").classList.toggle("show", vis === 0);
}

/* ── CHARTS ──────────────────────────────────────────────────────────────────*/
function switchChart(btn, id) {
  document.querySelectorAll(".hctab").forEach(t => t.classList.remove("on"));
  btn.classList.add("on");
  document.getElementById("hc-bp").style.display    = id === "bp"   ? "block" : "none";
  document.getElementById("hc-peso").style.display  = id === "peso" ? "block" : "none";
}

/* ── MODAL / CONSULTA ────────────────────────────────────────────────────────*/
function selC(el) {
  document.querySelectorAll(".copt").forEach(o => o.classList.remove("sel"));
  el.classList.add("sel");
}

/* ── CONSULTA — validación TA ────────────────────────────────────────────────*/
function chk() {
  const s = +document.getElementById("f-s").value || 0;
  const d = +document.getElementById("f-d").value || 0;
  const si = document.getElementById("f-s"), di = document.getElementById("f-d");
  const sh = document.getElementById("h-s"),  dh = document.getElementById("h-d");

  if (s >= 160)        { si.className = "fld-input ferr"; sh.className = "fhint err"; sh.textContent = "⚠ Valor muy elevado (≥160) — alerta crítica al guardar"; }
  else if (s >= 140)   { si.className = "fld-input ferr"; sh.className = "fhint err"; sh.textContent = "⚠ Valor elevado (≥140) — alerta moderada al guardar"; }
  else if (s < 60 || s > 220) { si.className = "fld-input ferr"; sh.className = "fhint err"; sh.textContent = "✗ Fuera de rango válido (60–220) — verificar medición"; }
  else                 { si.className = "fld-input fok";  sh.className = "fhint ok";  sh.textContent = "✓ Dentro del rango normal"; }

  if (d >= 110)        { di.className = "fld-input ferr"; dh.className = "fhint err"; dh.textContent = "⚠ Valor muy elevado (≥110) — alerta crítica al guardar"; }
  else if (d >= 90)    { di.className = "fld-input ferr"; dh.className = "fhint err"; dh.textContent = "⚠ Valor elevado (≥90) — alerta moderada al guardar"; }
  else                 { di.className = "fld-input fok";  dh.className = "fhint ok";  dh.textContent = "✓ Dentro del rango normal"; }
}
