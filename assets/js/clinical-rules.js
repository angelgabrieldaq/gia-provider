/* clinical-rules.js — Gia · Módulo Obstétrico Inteligente
 * Lógica clínica validada con obstetra. NO modificar umbrales sin revisión médica.
 * Spec Técnico v2.0 — ISSHP 2018 / IADPSG / ACOG / CLAP */

/* ── PARSING DE FECHAS SIN SHIFT UTC ────────────────────────────────────────
 * new Date("YYYY-MM-DD") interpreta como UTC medianoche → en UTC-3 retrocede un día.
 * Usar new Date(year, month-1, day) fuerza construcción local, sin desplazamiento.
 */
function parseLocalDate(v) {
  const [yyyy, mm, dd] = v.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}

/* ── EDAD EN AÑOS — helper centralizado ──────────────────────────────────────
 * Elimina el cálculo duplicado en calcEdad, calcRisk y updateStickyHeader.
 * @param {string} dateStr  Valor de un <input type="date"> ("YYYY-MM-DD")
 * @returns {number|null}   Edad en años completos, o null si dateStr está vacío.
 */
function getPatientAge(dateStr) {
  if (!dateStr) return null;
  const d   = parseLocalDate(dateStr);
  const now = new Date();
  let age   = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() ||
     (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

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
    const sibling = input.nextElementSibling;
    if (sibling && sibling.classList.contains("fhint")) {
      hint = sibling;
      hint.id = hintId;
    } else {
      hint = document.createElement("div");
      hint.id = hintId;
      const fld = input.closest(".fld");
      if (fld) {
        fld.appendChild(hint);
      } else {
        input.insertAdjacentElement("afterend", hint);
      }
    }
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
  const age = getPatientAge(v);
  if (age === null || age < 12 || age > 55) {
    h.className = "fhint err"; h.textContent = "✗ Verificar fecha"; return;
  }
  h.className = "fhint ok"; h.textContent = age + " años";
  /* auto-check edad ≥35 como factor moderado PE */
  const cbEdad = document.getElementById("cb-edad35");
  if (cbEdad) { cbEdad.checked = (age >= 35); }
  calcRisk();
  updateStickyHeader();
}

/* ── EGA POR FUM ─────────────────────────────────────────────────────────────*/
function calcEGA() {
  const v = document.getElementById("np-fum").value;
  const h = document.getElementById("h-ega");
  if (!v) { h.textContent = ""; return; }
  const fum = parseLocalDate(v), hoy = new Date();
  const dias = Math.floor((hoy - fum) / 86400000);
  if (dias < 0 || dias > 294) {
    h.className = "fhint err"; h.textContent = "✗ Verificar fecha de FUM"; return;
  }
  const sem = Math.floor(dias / 7), rem = dias % 7;
  const pep = new Date(fum); pep.setDate(pep.getDate() + 280);
  const pepStr = pep.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  h.className = "fhint ok";
  h.textContent = "EGA: " + sem + "+" + rem + " sem · Parto estimado (Naegele): " + pepStr;
  updateStickyHeader();
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

  const eco    = parseLocalDate(ecoFecha);
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
  updateStickyHeader();
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
    const age = getPatientAge(fnac.value);
    if (age !== null && age >= 35) factorsM.push("Edad materna ≥ 35 años (" + age + " años)");
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

  /* ACTUALIZAR HEADER STICKY (spec v4.0) */
  const stickyHd = document.getElementById("np-sticky-hd");
  if (stickyHd) stickyHd.className = "np-sticky-hd " + cls;

  /* Guardar factores en rb-factors (hidden) para que updateStickyHeader() los lea */
  const rbFac = document.getElementById("rb-factors");
  if (rbFac) {
    if (factorsH.length === 0 && factorsM.length === 0) {
      rbFac.innerHTML = "";
    } else {
      rbFac.innerHTML =
        factorsH.map(f => `<div class="rb-factor fh">${f}</div>`).join("") +
        factorsM.map(f => `<div class="rb-factor fm">${f}</div>`).join("");
    }
  }

  updateStickyHeader();
}

/* ══════════════════════════════════════════════════════════════════════════
 * evaluarPreeclampsiaFASGO2025 — Algoritmo FASGO 2025
 * Consenso de Trastornos Hipertensivos en el Embarazo — Argentina
 *
 * Implementa clasificación binaria: PE con o sin signos de severidad.
 * Elimina la categoría "PE leve/severa" per FASGO 2025.
 * NO modificar umbrales sin revisión médica.
 *
 * @param {Object} d
 * @param {number}  d.pas                    PAS (mmHg)
 * @param {number}  d.pad                    PAD (mmHg)
 * @param {Object}  [d.sintomas]
 * @param {boolean} [d.sintomas.cefalea]     Cefalea intensa persistente
 * @param {boolean} [d.sintomas.escotomas]   Alteraciones visuales / escotomas
 * @param {boolean} [d.sintomas.eclampsia]   Convulsión establecida
 * @param {boolean} [d.sintomas.epigastralgia] Epigastralgia / dolor hipocondrio D
 * @param {Object}  [d.lab]
 * @param {number}  [d.lab.got]              GOT/AST (U/L)
 * @param {number}  [d.lab.gpt]              GPT/ALT (U/L)
 * @param {number}  [d.lab.plaquetas]        Recuento plaquetario (/mm³)
 * @param {number}  [d.lab.uRPC]             Razón Prot/Creat urinaria (mg/mmol)
 * @param {number}  [d.lab.proteinuria24h]   Proteinuria 24h (mg/24h)
 * @param {boolean} [d.lab.tirasReactivas]   Solo tiras cualitativas disponibles
 * @returns {Object} Resultado clínico estructurado
 * ══════════════════════════════════════════════════════════════════════════ */
function evaluarPreeclampsiaFASGO2025(d) {
  const r = {
    emergenciaHipertensiva: false,
    clasificacion:          null,   // null|'sin_severidad'|'con_severidad'|'pendiente'
    signosSeveridad:        [],
    proteinuriaSignificativa: null,
    advertenciaTiras:       false,
    mgso4Indicado:          false,
    mgso4Protocolo:         null,
    alertCards:             [],
  };

  const pas  = parseFloat(d.pas) || 0;
  const pad  = parseFloat(d.pad) || 0;
  const sint = d.sintomas || {};
  const lab  = d.lab      || {};

  /* ── 1. EMERGENCIA HIPERTENSIVA ──────────────────────────────────────────
   * FASGO 2025: PAS ≥ 160 y/o PAD ≥ 110 → antihipertensivo < 30–60 min.    */
  if (pas >= 160 || pad >= 110) {
    r.emergenciaHipertensiva = true;
    r.alertCards.push({
      level:   'critical',
      titulo:  '🚨 Emergencia hipertensiva',
      cuerpo:  `PA ${pas}/${pad} mmHg supera umbral de emergencia (≥ 160/110). Iniciar antihipertensivo de acción rápida dentro de los próximos 30–60 minutos.`,
      detalle: 'Opciones de primera línea (FASGO 2025 sec. 6.2):\n' +
               '• Labetalol 20 mg IV — puede repetir c/10 min (máx 300 mg total)\n' +
               '• Nifedipina 10 mg VO — puede repetir c/30 min (máx 30 mg)\n' +
               '⚠ No usar Nifedipina sublingual. No usar Hidralazina IV de primera línea.',
    });
  }

  /* ── 2. PROTEINURIA SIGNIFICATIVA ────────────────────────────────────────
   * FASGO 2025: punto de corte diagnóstico uRPC ≥ 30 mg/mmol.
   * Tiras reactivas cualitativas NO son suficientes para confirmar diagnóstico. */
  if (lab.tirasReactivas) {
    r.advertenciaTiras = true;
    r.alertCards.push({
      level:   'warn',
      titulo:  '⚠ Tiras reactivas: resultado cualitativo insuficiente',
      cuerpo:  'Las tiras reactivas (+/++) no son suficientes para confirmar proteinuria significativa según FASGO 2025.',
      detalle: 'Se requiere alguno de los siguientes métodos cuantitativos:\n' +
               '• Razón Proteína/Creatinina urinaria (uRPC) ≥ 30 mg/mmol\n' +
               '• Proteinuria en orina de 24h ≥ 300 mg/24h\n' +
               'Solicitar muestra de orina para uRPC antes de descartar diagnóstico.',
    });
  }

  if (lab.uRPC != null && !isNaN(lab.uRPC)) {
    r.proteinuriaSignificativa = lab.uRPC >= 30;
  } else if (lab.proteinuria24h != null && !isNaN(lab.proteinuria24h)) {
    r.proteinuriaSignificativa = lab.proteinuria24h >= 300;
  }

  /* ── 3. SIGNOS DE SEVERIDAD (compromiso de órgano blanco) ───────────────
   * FASGO 2025: clasificación binaria — PE con o sin signos de severidad.   */

  /* Neurológico */
  if (sint.eclampsia) {
    r.signosSeveridad.push({ sistema: 'Neurológico', desc: 'Eclampsia establecida (convulsión tónico-clónica)' });
  }
  if (sint.cefalea) {
    r.signosSeveridad.push({ sistema: 'Neurológico', desc: 'Cefalea intensa persistente (no cede a analgesia habitual)' });
  }
  if (sint.escotomas) {
    r.signosSeveridad.push({ sistema: 'Neurológico', desc: 'Alteraciones visuales / escotomas' });
  }

  /* Hepático — umbral doble del normal: GOT/GPT > 70 U/L (FASGO 2025) */
  if (sint.epigastralgia) {
    r.signosSeveridad.push({ sistema: 'Hepático', desc: 'Epigastralgia / dolor en hipocondrio derecho' });
  }
  if (lab.got != null && !isNaN(lab.got) && lab.got > 70) {
    r.signosSeveridad.push({ sistema: 'Hepático', desc: `GOT/AST ${lab.got} U/L — elevada al doble del límite superior (> 70 U/L)` });
  }
  if (lab.gpt != null && !isNaN(lab.gpt) && lab.gpt > 70) {
    r.signosSeveridad.push({ sistema: 'Hepático', desc: `GPT/ALT ${lab.gpt} U/L — elevada al doble del límite superior (> 70 U/L)` });
  }

  /* Hematológico — trombocitopenia grave */
  if (lab.plaquetas != null && !isNaN(lab.plaquetas) && lab.plaquetas < 100000) {
    r.signosSeveridad.push({
      sistema: 'Hematológico',
      desc: `Plaquetas ${lab.plaquetas.toLocaleString('es-AR')}/mm³ — trombocitopenia grave (< 100.000/mm³)`,
    });
  }

  /* ── 4. CLASIFICACIÓN FINAL ──────────────────────────────────────────────*/
  const htaPresente = (pas >= 140 || pad >= 90);

  if (htaPresente) {
    if (r.signosSeveridad.length > 0) {
      r.clasificacion = 'con_severidad';
    } else if (r.proteinuriaSignificativa === true) {
      r.clasificacion = 'sin_severidad';
    } else if (r.proteinuriaSignificativa === null && lab.tirasReactivas) {
      r.clasificacion = 'pendiente';
    }
  }

  const descSignos = r.signosSeveridad
    .map(s => `• [${s.sistema}] ${s.desc}`)
    .join('\n');

  if (r.clasificacion === 'con_severidad') {
    r.alertCards.push({
      level:   'critical',
      titulo:  '🔴 Preeclampsia con signos de severidad',
      cuerpo:  `${r.signosSeveridad.length} signo(s) de severidad detectado(s). Requiere internación, evaluación multidisciplinaria y decisión de finalización según EGA. (FASGO 2025)`,
      detalle: descSignos || null,
    });
  } else if (r.clasificacion === 'sin_severidad') {
    r.alertCards.push({
      level:   'warn',
      titulo:  '🟡 Preeclampsia sin signos de severidad',
      cuerpo:  'PA ≥ 140/90 con proteinuria significativa confirmada. Sin signos de severidad al momento de la evaluación. Continuar monitoreo estrecho (control en 48–72h). (FASGO 2025)',
      detalle: null,
    });
  } else if (r.clasificacion === 'pendiente') {
    r.alertCards.push({
      level:   'warn',
      titulo:  '⏳ Confirmación de proteinuria pendiente',
      cuerpo:  'HTA presente. Confirmar proteinuria con uRPC ≥ 30 mg/mmol o proteinuria en orina de 24h ≥ 300 mg/24h para clasificar definitivamente.',
      detalle: null,
    });
  }

  /* ── 5. NEUROPROTECCIÓN — MgSO4 ─────────────────────────────────────────
   * FASGO 2025: indicado en PE con severidad, eclampsia o ante parto inminente.
   * Monitoreo CLÍNICO mandatorio. NO solicitar magnesemia de rutina.          */
  if (r.clasificacion === 'con_severidad' || sint.eclampsia) {
    r.mgso4Indicado  = true;
    r.mgso4Protocolo = {
      ataque:        '4 g IV en 15–20 min (solución MgSO4 20% en 100 mL SF o agua dest.)',
      mantenimiento: '1 g/h IV en infusión continua por 24 horas posparto',
      monitoreo: [
        'Reflejo patelar presente (si ausente → suspender infusión)',
        'Diuresis ≥ 25 mL/hora',
        'Frecuencia respiratoria ≥ 14 rpm',
        'Estado del sensorio conservado',
      ],
      antidoto: 'Gluconato de calcio 1 g IV (10 mL de solución 10%) — disponible a pie de cama',
      nota:     'NO solicitar magnesemia de rutina. El monitoreo es estrictamente clínico. (FASGO 2025 sec. 8.3)',
    };
    r.alertCards.push({
      level:   'critical',
      titulo:  '💊 Protocolo MgSO4 — Neuroprotección indicada',
      cuerpo:  `Ataque: ${r.mgso4Protocolo.ataque}. Mantenimiento: ${r.mgso4Protocolo.mantenimiento}.`,
      detalle: '__MGSO4_CHECKLIST__',
    });
  }

  return r;
}

/* ── HEADER CLÍNICO STICKY — spec v4.0 ─────────────────────────────────────
 * Sincroniza nombre, edad, DNI, fórmula, EGA, FPP y riesgo PE en tiempo real. */
function updateStickyHeader() {
  const hd = document.getElementById("np-sticky-hd");
  if (!hd) return;

  const nombre   = (document.getElementById("np-nombre")?.value || "").trim();
  const apellido = (document.getElementById("np-apellido")?.value || "").trim();
  const nameEl   = document.getElementById("nsh-name");
  if (nameEl) {
    if (nombre || apellido) {
      nameEl.textContent = (apellido ? apellido + ", " : "") + nombre;
      nameEl.style.color = "var(--txt)";
    } else {
      nameEl.textContent = "Nueva paciente";
      nameEl.style.color = "var(--txt3)";
    }
  }

  const fnac  = document.getElementById("np-fnac");
  const ageEl = document.getElementById("nsh-edad");
  if (fnac && fnac.value && ageEl) {
    const age = getPatientAge(fnac.value);
    ageEl.textContent = age !== null ? age + " años" : "—";
    ageEl.style.color = age >= 35 ? "var(--s-warn)" : "var(--txt2)";
  } else if (ageEl) ageEl.textContent = "—";

  const dniEl = document.getElementById("nsh-dni");
  if (dniEl) dniEl.textContent = document.getElementById("np-dni")?.value || "—";

  const g  = parseInt(document.getElementById("np-g")?.value)  || 1;
  const pv = parseInt(document.getElementById("np-p")?.value)  || 0;
  const av = parseInt(document.getElementById("np-a")?.value)  || 0;
  const cv = parseInt(document.getElementById("np-c")?.value)  || 0;
  const fmlEl = document.getElementById("nsh-formula");
  if (fmlEl) fmlEl.textContent = "G"+g+" P"+pv+" A"+av+" C"+cv;

  const fum   = document.getElementById("np-fum");
  const egaEl = document.getElementById("nsh-ega");
  const fppEl = document.getElementById("nsh-fpp");
  if (fum && fum.value && egaEl && fppEl) {
    const fumD = parseLocalDate(fum.value), hoy = new Date();
    const dias = Math.floor((hoy - fumD) / 86400000);
    if (dias >= 0 && dias <= 294) {
      egaEl.textContent = Math.floor(dias/7) + "+" + (dias%7) + " sem";
      const fpp = new Date(fumD); fpp.setDate(fpp.getDate() + 280);
      fppEl.textContent = fpp.toLocaleDateString("es-AR", { day:"numeric", month:"short" });
    }
  } else {
    if (egaEl) egaEl.textContent = "—";
    if (fppEl) fppEl.textContent = "—";
  }

  const cls = hd.className.includes("rr-high") ? "rr-high"
            : hd.className.includes("rr-mod")  ? "rr-mod"
            : hd.className.includes("rr-low")  ? "rr-low"
            : "rr-none";
  const riskValEl = document.getElementById("nsh-risk-val");
  if (riskValEl) {
    const levelMap = { "rr-high":"Alto", "rr-mod":"Moderado", "rr-low":"Bajo", "rr-none":"—" };
    riskValEl.textContent = levelMap[cls] || "—";
    riskValEl.className   = "nsh-risk-val " + cls;
  }

  const pillsEl = document.getElementById("nsh-pills");
  const rbFac   = document.getElementById("rb-factors");
  if (pillsEl && rbFac) {
    const items = rbFac.querySelectorAll(".rb-factor");
    pillsEl.innerHTML = Array.from(items).slice(0, 3).map(el => {
      const isPh = el.classList.contains("fh");
      return `<div class="nsh-pill ${isPh?"ph":"pm"}">${el.textContent.trim()}</div>`;
    }).join("");
  }
}

/* ── COCIENTE sFlt-1/PlGF — FASGO 2025 / Zeisler et al. ─────────────────────
 * Umbral diagnóstico validado: ≤ 38 descarta PE en las próximas 4 semanas.
 * > 85 en embarazos ≥ 34 sem: alta probabilidad de PE a corto plazo.
 * NO modificar umbrales sin revisión médica (evidencia clase I FASGO 2025).
 */
function calcAngiogenicRatio() {
  const sflt1 = parseFloat(document.getElementById('lab3-sflt1')?.value);
  const plgf  = parseFloat(document.getElementById('lab3-plgf')?.value);
  const hint  = document.getElementById('lab3-ratio-hint');
  if (!hint) return;

  if (isNaN(sflt1) || isNaN(plgf) || plgf === 0) {
    hint.className   = "fhint";
    hint.style.color = "";
    hint.textContent = "— Ingresar ambos valores para calcular";
    return;
  }

  const ratio = sflt1 / plgf;
  let cls, color, msg;
  if (ratio <= 38) {
    cls   = "fhint ok";
    color = "var(--s-ok)";
    msg   = `✓ Cociente ${ratio.toFixed(1)} ≤ 38 — Bajo riesgo de PE en próximas 4 semanas (FASGO 2025)`;
  } else if (ratio <= 85) {
    cls   = "fhint warn";
    color = "var(--s-warn)";
    msg   = `⚠ Cociente ${ratio.toFixed(1)} entre 38 y 85 — Riesgo intermedio. Intensificar seguimiento.`;
  } else {
    cls   = "fhint err";
    color = "var(--s-err)";
    msg   = `🚨 Cociente ${ratio.toFixed(1)} > 85 — Alta probabilidad de PE a corto plazo. Evaluar internación (FASGO 2025).`;
  }

  hint.className   = cls;
  hint.style.color = color;
  hint.textContent = msg;
}
