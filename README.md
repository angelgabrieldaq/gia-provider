# Gia · Módulo Obstétrico Inteligente
### by Zenoxia

SaMD para seguimiento clínico de embarazos de alto riesgo con foco en preeclampsia.
Parte del ecosistema Zenoxia junto a Cordis (Guardia) y Kairos (Quirófanos).

---

## Estructura del proyecto

```
gia-provider/
├── index.html          # Login / pantalla de bienvenida
├── dashboard.html      # Dashboard clínico principal
├── clinical-rules.js   # Lógica clínica — umbrales, alertas, riesgo PE
└── ui-helpers.js       # Navegación, breadcrumb y helpers de UI
```

## Cómo usar

1. Abrir `index.html` en el navegador
2. Ingresar cualquier correo y contraseña (modo demo)
3. El sistema redirige automáticamente al dashboard clínico

No requiere servidor ni dependencias. HTML/CSS/JS puro con LocalStorage.

---

## Pantallas incluidas

- **Login** — Pantalla de bienvenida con branding Gia by Zenoxia
- **Dashboard** — Lista de pacientes ordenada por riesgo y ECA
- **Ficha de paciente** — Resumen clínico longitudinal con gráficos de tendencia de PA y peso
- **Nueva paciente** — Formulario en 4 pasos con header sticky clínico en tiempo real
- **Nueva consulta** — Campos Tier A obligatorios con validaciones clínicas
- **Modal de alerta crítica** — Flujo de confirmación de conducta (HARD/SOFT)
- **Historial clínico** — Timeline longitudinal con filtros por trimestre y alertas
- **Laboratorios** — Carga por trimestre con umbrales IADPSG/ADA y FASGO 2025

---

## Arquitectura de módulos JS

### clinical-rules.js
Lógica clínica validada con obstetra. No modificar umbrales sin revisión médica.

- `evalClinicalField(input)` — motor genérico de alertas por data-attributes
- `calcRisk()` — riesgo PE desde 5 fuentes: edad, IMC, G/P/A/C, HTA y checkboxes CLAP
- `calcEdad()` / `calcIMC()` / `calcEGA()` / `calcEcoCorrected()` — cálculos automáticos
- `calcFormulaObstetrica()` — auto-marcado de primigesta, pérdidas y cesárea
- `evalHTATipo()` — clasificación HTA en 4 variantes FASGO 2025
- `updateStickyHeader()` — sincroniza header clínico en tiempo real
- `evaluarPreeclampsiaFASGO2025(d)` — motor de alertas Consenso FASGO 2025

### ui-helpers.js
Sin lógica clínica. Solo navegación y helpers de UI.

- `go()` / `setBB()` — navegación entre pantallas y breadcrumb
- `showDash()` / `showPatient()` / `showNueva()` etc. — transiciones de pantalla
- `goStep(n)` — navegación entre los 4 pasos del formulario de nueva paciente
- `togHabit()` / `togVacDate()` / `togMamEstudio()` — toggles de submenús
- `filterHist()` / `switchChart()` — filtros del historial y gráficos

---

## Design tokens

Sistema de diseño Zenoxia definido en `:root`:

| Variable | Uso |
|---|---|
| `--p` / `--p-dark` / `--p-light` | Acciones primarias, topbar |
| `--s-err` / `--s-err-l` / `--s-err-m` | Alertas críticas, riesgo alto |
| `--s-warn` / `--s-warn-l` / `--s-warn-m` | Alertas moderadas, vigilancia |
| `--s-ok` / `--s-ok-l` / `--s-ok-m` | Estados estables, confirmados |
| `--s-info` / `--s-info-l` / `--s-info-m` | Información, vigilancia leve |
| `--bg` / `--bg2` / `--bg3` | Fondos por nivel |
| `--txt` / `--txt2` / `--txt3` | Texto por jerarquía |
| `--brd` / `--brd2` | Bordes por énfasis |
| `--r` / `--r-lg` | Border radius |

---

## Convención de data-attributes (mandatoria en SaMD)

Todos los inputs con alertas clínicas usan data-attributes, nunca IDs hardcodeados:

```html
<input
  data-clinical-type="hemoglobin"
  data-alert-threshold="11"
  data-alert-direction="below"
  data-alert-level="warn"
  data-alert-message="Hb < 11 g/dL — anemia gestacional"
  oninput="evalClinicalField(this)" />
```

---

## Validación clínica

| Estándar | Uso |
|---|---|
| Consenso FASGO 2025 | Clasificación HTA, criterios PE, protocolo MgSO4, uRPC |
| ISSHP 2018 | Factores de riesgo PE para calcRisk() |
| ACOG 2024 | Umbrales de severidad y conducta |
| NICE 2023 / SOMANZ 2023 | Referencia cruzada de protocolos |
| IADPSG / ADA | Umbrales de laboratorio metabólico |

---

## Estado del proyecto — Sprint 1

- ✅ Login con branding Zenoxia
- ✅ Dashboard con semáforo ECA y ROB
- ✅ Ficha clínica con tendencia longitudinal PA y peso
- ✅ Nueva paciente — formulario en 4 pasos con header clínico sticky
- ✅ Motor de riesgo PE (5 fuentes) — ISSHP 2018 / FASGO 2025
- ✅ Clasificación HTA en 4 variantes FASGO 2025
- ✅ Motor de alertas FASGO 2025 — preeclampsia, MgSO4, uRPC
- ✅ Formulario de consulta con Tier A/B y validaciones clínicas
- ✅ Historial longitudinal con filtros por trimestre
- ✅ Laboratorios por trimestre con umbrales IADPSG/ADA
- ✅ Hábitos, vacunas y preventivo con savePatient() completo
- 🔜 Backend NestJS + PostgreSQL (Sprint 1 semanas 3-4)
- 🔜 Motor de alertas real conectado al backend
- 🔜 Timeline longitudinal persistente
- 🔜 Exportación PDF del historial por paciente

---

## Ecosistema Zenoxia

Gia es parte de un ecosistema de tres módulos independientes que comparten
el repositorio central `zenoxia-core` (modelos SQLAlchemy bajo HL7 FHIR):

| Módulo | Foco | Mercado |
|---|---|---|
| **Gia** | Obstetricia — seguimiento embarazos de alto riesgo | Consultorios privados → Clínicas |
| **Cordis** | Guardia — trazabilidad de tiempos y logística | Guardias hospitalarias |
| **Kairos** | Quirófano — tracking de fases quirúrgicas | Jefaturas de quirófano |

---

## Clasificación regulatoria

Gia es un **Software as a Medical Device (SaMD)** bajo normativa ANMAT Argentina
(Disposición GMC 25/21 MERCOSUR). La gestión de riesgos sigue la norma ISO 14971.

---

© 2026 Zenoxia. Todos los derechos reservados.
Este código es confidencial y propietario de Zenoxia.
No se permite su uso, copia o distribución sin autorización expresa.
