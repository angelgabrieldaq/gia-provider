/* clinical-rules.js — Gia · Módulo Obstétrico Inteligente
 * Lógica clínica validada con obstetra. NO modificar umbrales sin revisión médica.
 * Spec Técnico v2.0 — ISSHP 2018 / IADPSG / ACOG / CLAP */

/* ── CAMPO CLÍNICO GENÉRICO ──────────────────────────────────────────────────
 * Lee SOLO desde data-attributes. NUNCA desde el id del campo.
 * Esto es mandatorio en un SaMD: si el id cambia, la alerta no puede morir
 * en silencio. Los data-attributes son el contrato clínico del campo.
 */
function evalClinicalField(input) {
  const val       = parseFloat(input.value);
  const threshold = parseFloat(input.dataset.alertThreshold);
  const direction = input.dataset.alertDirection;   // "above" | "below"
  const level     = input.dataset.alertLevel;       // "warn" | "danger" | "critical"
  const message   = input.dataset.alertMessage;
  const hintId    = input.id + "-hint";

  let hint = document.getElementById(hintId);
  if (!hint) {
    hint = document.createElement("div");
    hint.id = hintId;
    input.parentNode.appendChild(hint);
  }

  if (isNaN(val) || input.value === "") {
    hint.textContent = "";
    hint.className   = "fhint";
    input.classList.remove("fok", "ferr");
    return;
  }

  const triggered = direction === "below" ? val < threshold : val >= threshold;

  if (triggered) {
    const isErr = level === "critical" || level === "danger";
    hint.className    = "fhint" + (isErr ? " err" : " warn");
    hint.style.color  = isErr ? "var(--s-err)" : "var(--s-warn)";
    hint.textContent  = message;
    input.classList.add("ferr");
    input.classList.remove("fok");
  } else {
    hint.className   = "fhint ok";
    hint.style.color = "var(--s-ok)";
    hint.textContent = "✓ Valor dentro del rango normal";
    input.classList.add("fok");
    input.classList.remove("ferr");
  }
}

/* ── EDAD ────────────────────────────────────────────────────────────────────*/
function calcEdad() {
  const v = document.getElementById("np-fnac").value;
  const h = document.getElementById("h-edad");
  if (!v) { h.textContent = ""; return; }
  const d = new Date(v), t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--;
  if (age < 12 || age > 55) {
    h.className = "fhint err"; h.textContent = "✗ Verificar fecha"; return;
  }
  h.className = "fhint ok"; h.textContent = age + " años";
  /* auto-check edad ≥35 como factor moderado PE */
  const cbEdad = document.getElementById("cb-edad35");
  if (cbEdad) { cbEdad.checked = (age >= 35); }
  calcRisk();
}

/* ── EGA POR FUM ─────────────────────────────────────────────────────────────*/
function calcEGA() {
  const v = document.getElementById("np-fum").value;
  const h = document.getElementById("h-ega");
  if (!v) { h.textContent = ""; return; }
  const fum = new Date(v), hoy = new Date();
  const dias = Math.floor((hoy - fum) / 86400000);
  if (dias < 0 || dias > 294) {
    h.className = "fhint err"; h.textContent = "✗ Verificar fecha de FUM"; return;
  }
  const sem = Math.floor(dias / 7), rem = dias % 7;
  const pep = new Date(fum); pep.setDate(pep.getDate() + 280);
  const pepStr = pep.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  h.className = "fhint ok";
  h.textContent = "EGA: " + sem + "+" + rem + " sem · Parto estimado (Naegele): " + pepStr;
}

/* ── EGA CORREGIDA POR ECO 1er TRIMESTRE ─────────────────────────────────────
 * FPP_eco = fecha_eco + (280 - (semanas*7 + días))
 * Sobreescribe FPP si el embarazo ≤ 13+6 semanas al momento de la eco.
 */
function calcEcoCorrected() {
  const ecoFecha = document.getElementById("np-eco1-fecha").value;
  const ecoSem   = parseInt(document.getElementById("np-eco1-sem").value)   || 0;
  const ecoDias  = parseInt(document.getElementById("np-eco1-dias").value)  || 0;
  const h        = document.getElementById("h-eco1");

  if (!ecoFecha || (!ecoSem && !ecoDias)) { if (h) h.textContent = ""; return; }
  if (ecoSem > 13 || (ecoSem === 13 && ecoDias > 6)) {
    if (h) { h.className = "fhint err"; h.textContent = "✗ Solo aplicable en 1er trimestre (≤ 13+6 sem)"; }
    return;
  }

  const eco    = new Date(ecoFecha);
  const egaDias = ecoSem * 7 + ecoDias;
  const fppEco  = new Date(eco);
  fppEco.setDate(fppEco.getDate() + (280 - egaDias));

  const fppStr = fppEco.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  if (h) {
    h.className  = "fhint ok";
    h.textContent = "FPP corregida: " + fppStr + " (EGA al momento de eco: " + ecoSem + "+" + ecoDias + ")";
  }
}

/* ── IMC + AUTO-CHECKBOX OBESIDAD ────────────────────────────────────────────
 * Umbrales OMS: bajo <18.5 · normal 18.5–24.9 · sobrepeso 25–29.9 · obesidad ≥30
 */
function calcIMC() {
  const peso  = parseFloat(document.getElementById("np-peso").value);
  const talla = parseFloat(document.getElementById("np-talla").value);
  const h     = document.getElementById("h-imc");
  if (!h) return;

  if (!peso || !talla || talla < 100 || talla > 220) {
    h.textContent = ""; return;
  }
  const tallaM = talla / 100;
  const imc    = peso / (tallaM * tallaM);
  const imcStr = imc.toFixed(1);

  let label, cls;
  if (imc < 18.5)      { label = "Bajo peso";   cls = "fhint warn"; }
  else if (imc < 25)   { label = "Normal";       cls = "fhint ok";   }
  else if (imc < 30)   { label = "Sobrepeso";    cls = "fhint warn"; }
  else                 { label = "Obesidad";     cls = "fhint err";  }

  h.className   = cls;
  h.style.color = imc >= 30 ? "var(--s-err)" : imc >= 25 ? "var(--s-warn)" : imc < 18.5 ? "var(--s-warn)" : "var(--s-ok)";
  h.textContent = "IMC: " + imcStr + " kg/m² — " + label;

  /* auto-marcar factor moderado PE: obesidad pregestacional */
  const cbOb = document.getElementById("cb-obesidad");
  if (cbOb) { cbOb.checked = (imc >= 30); calcRisk(); }
}

/* ── FÓRMULA OBSTÉTRICA — AUTO-CÁLCULO DE RIESGO ────────────────────────────
 * Lee G/P/A/C y auto-marca los factores de riesgo derivados.
 * Fuente: ISSHP 2018 / FASGO 2025.
 * NO modificar la lógica sin revisión médica.
 */
function calcFormulaObstetrica() {
  const g = parseInt(document.getElementById("np-g").value)  || 1;
  const p = parseInt(document.getElementById("np-p").value)  || 0;
  const a = parseInt(document.getElementById("np-a").value)  || 0;
  const c = parseInt(document.getElementById("np-c").value)  || 0;

  const display = document.getElementById("np-formula-display");
  if (display) {
    display.textContent  = "G" + g + " P" + p + " A" + a + " C" + c;
    display.style.color  = "var(--txt)";
    display.style.fontWeight = "600";
  }

  /* AUTO-MARCADO: Primigesta (G=1, P=0) — ISSHP 2018 / FASGO 2025 sec 3 */
  const cbPrimigesta = document.getElementById("cb-primigesta");
  if (cbPrimigesta) cbPrimigesta.checked = (g === 1 && p === 0);

  /* AUTO-MARCADO: Pérdidas recurrentes (A ≥ 3) — FASGO 2025 / ISSHP 2018 */
  const cbPerdidas = document.getElementById("cb-perdidas");
  const hAbortos   = document.getElementById("h-abortos");
  if (cbPerdidas) cbPerdidas.checked = (a >= 3);
  if (hAbortos) {
    if (a >= 3) {
      hAbortos.className   = "fhint err";
      hAbortos.textContent = "⚠ Pérdidas recurrentes — factor moderado PE auto-marcado";
    } else {
      hAbortos.textContent = "";
    }
  }

  /* REGISTRO: Cesárea anterior (C ≥ 1) — FASGO 2025 sección 7.3 */
  const hCesareas = document.getElementById("h-cesareas");
  if (hCesareas) {
    if (c >= 1) {
      hCesareas.className  = "fhint";
      hCesareas.style.color = "var(--s-info)";
      hCesareas.textContent = "ℹ Cesárea anterior registrada — factor de riesgo para HTA de novo en puerperio (FASGO 2025)";
    } else {
      hCesareas.textContent = "";
    }
  }

  const hFormula = document.getElementById("h-formula");
  if (hFormula) {
    const partes = [];
    if (g === 1 && p === 0) partes.push("primigesta");
    if (a >= 3)              partes.push("pérdidas recurrentes");
    if (c >= 1)              partes.push("cesárea anterior");
    if (partes.length > 0) {
      hFormula.className  = "fhint";
      hFormula.style.color = "var(--s-warn)";
      hFormula.textContent = "Factores detectados: " + partes.join(", ");
    } else {
      hFormula.textContent = "";
    }
  }

  calcRisk();
}

/* ── CLASIFICACIÓN HTA — FASGO 2025 ─────────────────────────────────────────
 * Evalúa el tipo de HTA y actualiza ROB + hint clínico.
 * Fuente: Consenso FASGO 2025 secciones 1 y 5 / ISSHP 2021.
 * NO modificar sin revisión médica.
 */
function evalHTATipo(select) {
  const val   = select.value;
  const hint  = document.getElementById("h-hta-tipo");
  const group = document.getElementById("hta-cronica-group");

  const msgs = {
    "":           { rob: null,  color: "",               msg: "" },
    esencial:     { rob: "h",   color: "var(--s-err)",   msg: "Factor MAYOR PE — ROB alto. 25% riesgo PE sobreimpuesta. Requiere MAPA. (FASGO 2025)" },
    secundaria:   { rob: "h",   color: "var(--s-err)",   msg: "Factor MAYOR PE — ROB alto. HTA secundaria: evaluar causa (renal, HAP, renovascular). (FASGO 2025)" },
    guardapolvo:  { rob: "m",   color: "var(--s-warn)",  msg: "Factor moderado PE. 4 de 10 evolucionan a HTAG. Confirmar con MAPA. (FASGO 2025)" },
    enmascarada:  { rob: "h",   color: "var(--s-err)",   msg: "Factor MAYOR PE. 7x más riesgo PE/eclampsia. Evaluar período nocturno con MAPA 24h. (FASGO 2025)" },
  };

  const cfg = msgs[val] || msgs[""];

  if (group) {
    if (cfg.rob) {
      group.dataset.w = cfg.rob;
    } else {
      delete group.dataset.w;
    }
  }

  if (hint) {
    if (cfg.msg) {
      hint.className   = "fhint";
      hint.style.color = cfg.color;
      hint.textContent = cfg.msg;
    } else {
      hint.textContent = "";
    }
  }

  calcRisk();
}

/* ── RIESGO PE v2 — ISSHP 2018 / FASGO 2025 ─────────────────────────────────
 * Lee TODAS las fuentes: edad, IMC, G/P/A/C, tipo HTA, checkboxes CLAP.
 * NO modificar umbrales sin revisión médica.
 */
function calcRisk() {
  const factorsH = [];
  const factorsM = [];

  /* FUENTE 1: EDAD — ≥35 años → moderado (ISSHP 2018) */
  const fnac = document.getElementById("np-fnac");
  if (fnac && fnac.value) {
    const d = new Date(fnac.value), now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() ||
       (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
    if (age >= 35) factorsM.push("Edad materna ≥ 35 años (" + age + " años)");
  }

  /* FUENTE 2: IMC — ≥30 → obesidad pregestacional → moderado (ISSHP 2018) */
  const pesoEl  = document.getElementById("np-peso");
  const tallaEl = document.getElementById("np-talla");
  if (pesoEl && tallaEl && pesoEl.value && tallaEl.value) {
    const peso = parseFloat(pesoEl.value);
    const talla = parseFloat(tallaEl.value);
    if (peso > 0 && talla > 100) {
      const imc = peso / ((talla / 100) ** 2);
      if (imc >= 30) factorsM.push("Obesidad pregestacional (IMC " + imc.toFixed(1) + " kg/m²)");
    }
  }

  /* FUENTE 3: FÓRMULA OBSTÉTRICA (ISSHP 2018) */
  const gEl = document.getElementById("np-g");
  const pEl = document.getElementById("np-p");
  const aEl = document.getElementById("np-a");
  if (gEl && pEl) {
    const g = parseInt(gEl.value) || 1;
    const pv = parseInt(pEl.value) || 0;
    if (g === 1 && pv === 0) factorsM.push("Primigesta (G1P0)");
  }
  if (aEl) {
    const av = parseInt(aEl.value) || 0;
    if (av >= 3) factorsM.push("Pérdidas gestacionales recurrentes (≥ 3)");
  }

  /* FUENTE 4: TIPO DE HTA (FASGO 2025 sección 1) */
  const htaEl = document.getElementById("np-hta-tipo");
  if (htaEl && htaEl.value) {
    const htaMap = {
      esencial:    { w: "h", label: "HTA crónica esencial" },
      secundaria:  { w: "h", label: "HTA crónica secundaria" },
      guardapolvo: { w: "m", label: "HTA de guardapolvo blanco" },
      enmascarada: { w: "h", label: "HTA enmascarada" },
    };
    const cfg = htaMap[htaEl.value];
    if (cfg) {
      if (cfg.w === "h") factorsH.push(cfg.label);
      else factorsM.push(cfg.label);
    }
  }

  /* FUENTE 5: CHECKBOXES CLAP — data-w="h"|"m" */
  document.querySelectorAll("#sc-nueva [data-w] input:checked").forEach(cb => {
    const w     = cb.closest("[data-w]").dataset.w;
    const label = cb.closest("label") ? cb.closest("label").textContent.trim() : "";
    if (w === "h") factorsH.push(label);
    else if (w === "m") factorsM.push(label);
  });

  /* CLASIFICACIÓN ISSHP 2018 */
  let level, cls, sub;
  if (factorsH.length >= 1) {
    level = "Alto"; cls = "rr-high";
    sub = factorsH.length + " factor" + (factorsH.length > 1 ? "es mayores" : " mayor");
    if (factorsM.length > 0)
      sub += " · " + factorsM.length + " moderado" + (factorsM.length > 1 ? "s" : "");
  } else if (factorsM.length >= 2) {
    level = "Alto"; cls = "rr-high";
    sub = factorsM.length + " factores moderados = alto (ISSHP 2018)";
  } else if (factorsM.length === 1) {
    level = "Moderado"; cls = "rr-mod";
    sub = "1 factor moderado — monitoreo reforzado";
  } else {
    level = "Bajo"; cls = "rr-low";
    sub = "Sin factores identificados";
  }

  /* ACTUALIZAR PANEL STICKY */
  const valEl = document.getElementById("rp-val");
  const subEl = document.getElementById("rp-sub");
  const hdEl  = document.getElementById("rp-hd");
  if (valEl) { valEl.textContent = level; valEl.className = "rp-val " + cls; }
  if (subEl) { subEl.textContent = sub;   subEl.className = "rp-sub " + cls; }
  if (hdEl)  { hdEl.className = "rp-hd " + cls; }

  /* RENDERIZAR FACTORES */
  const renderF = (list, id, dotCls, rowCls) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = `<div class="rp-factor fn"><div class="rp-dot dn"></div>Ninguno</div>`;
      return;
    }
    el.innerHTML = list.map(f =>
      `<div class="rp-factor ${rowCls}"><div class="rp-dot ${dotCls}"></div>${f}</div>`
    ).join("");
  };
  renderF(factorsH, "rp-factors-h", "dh", "fh");
  renderF(factorsM, "rp-factors-m", "dm", "fm");
}
