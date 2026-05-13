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

/* ── RIESGO PE (ISSHP 2018) ──────────────────────────────────────────────────
 * ≥1 factor mayor → Alto · ≥2 moderados → Alto · 1 moderado → Moderado · 0 → Bajo
 */
function calcRisk() {
  const chks = document.querySelectorAll("#sc-nueva .chk[data-w] input:checked");
  let hi = 0, mo = 0;
  chks.forEach(c => {
    const w = c.closest("[data-w]").dataset.w;
    if (w === "h") hi++; else mo++;
  });

  const rv  = document.getElementById("np-rr-val");
  const rs  = document.getElementById("np-rr-sub");
  const rr  = document.getElementById("np-risk-result");
  if (!rv || !rs || !rr) return;

  let lv, cl, sub;
  if (hi >= 1) {
    lv = "Alto"; cl = "rr-high";
    sub = hi + " factor" + (hi > 1 ? "es mayores" : " mayor") +
          (mo > 0 ? ", " + mo + " moderado" + (mo > 1 ? "s" : "") : "");
  } else if (mo >= 2) {
    lv  = "Alto"; cl = "rr-high";
    sub = mo + " factores moderados = riesgo alto (ISSHP 2018)";
  } else if (mo === 1) {
    lv  = "Moderado"; cl = "rr-mod";
    sub = "1 factor moderado — monitoreo reforzado";
  } else {
    lv  = "Bajo"; cl = "rr-low";
    sub = "Sin factores de riesgo identificados";
  }

  rv.textContent = lv;
  rs.textContent = sub;
  rr.className   = "risk-result " + cl;
}
