# ADR 002: Lógica Clínica Centralizada en Backend

**Status:** ACCEPTED  
**Date:** Mayo 2026  
**Deciders:** Product Owner (clínico), Arquitecto Full Stack  
**Affects:** Modelo de software, seguridad, auditoría ISO 14971, interoperabilidad futura  

---

## Contexto y Problema

Durante el Sprint 1 temprano, el frontend de Gia (`dashboard.html` + `clinical-rules.js`) contenía **toda** la lógica de cálculo clínico:
- Determinaba si un paciente era ROB BAJO/MODERADO/ALTO
- Calculaba el ECA (STABLE/WATCHFUL/ALERT/CRITICAL) basándose en vitales
- Generaba alertas según umbrales FASGO 2025

**El problema detectado en auditoría arquitectónica:**

```javascript
// ❌ INCORRECTO — Lógica clínica en el navegador
function calculateRisk(antecedents) {
  let rob = 'BAJO';
  if (antecedents.hta_cronica) rob = 'ALTO'; // Frontend decide
  return rob;
}

// ❌ INCORRECTO — ECA calculado en JavaScript
function calculateECA(vitals) {
  if (vitals.pa_sistolica >= 140) return 'ALERT'; // Navegador decide
  return 'STABLE';
}
```

**Riesgos clínicos:**
1. **Manipulación:** Un usuario malicioso abre DevTools y cambia `rob = 'BAJO'` a `'CRÍTICO'` sin tocar la base de datos
2. **Inconsistencia:** Frontend y backend pueden calcular cosas distintas
3. **Auditoría fallida:** Un auditor pregunta "¿Quién dijo que era ALERT?" y no hay forma de trazar. El código JavaScript no se puede auditar como base de datos

---

## Decisión

**Toda lógica clínica vive en el BACKEND. El frontend es un cliente "tonto".**

### Qué calcula el BACKEND
- ✅ ROB (Riesgo Obstétrico Basal) — en `RobCalculationService`
- ✅ ECA (Estado Clínico Actual) — en `FasgoRiskService`
- ✅ Alertas — según reglas FASGO 2025 en BD
- ✅ Campos obligatorios — según matriz condicional ROB+EGA
- ✅ Tendencias — delta de PA, ganancia de peso, etc.

### Qué hace el FRONTEND
- 🎨 Captura inputs (números, checkboxes)
- 🚀 Envía POST a `/api/pregnancies` o `/api/consultations`
- 🎨 Pinta la respuesta (colores, semáforos, alertas)
- ❌ NUNCA calcula nada clínicamente relevante

---

## Justificación Clínica

1. **Seguridad del paciente (ISO 14971):** Si la lógica vive en el backend, un desarrollo malicioso del frontend no puede burlar las reglas clínicas. El servidor SIEMPRE evalúa.

2. **Trazabilidad inmutable:** Cada decisión clínica queda registrada en la base de datos con timestamp, usuario, y justificación. No puede ser editada retroactivamente desde el navegador.

3. **Consistencia clínica:** No importa si la obstetra usa la web, una app móvil o una futura integración HL7 — el cálculo de ROB/ECA es idéntico porque vive en un solo lugar.

4. **Cumplimiento regulatorio:** ANMAT (Administración Nacional de Medicamentos, Alimentos y Tecnología Médica en Argentina) requiere que un SaMD demuestre que las decisiones clínicas están bajo control de software verificable, no en código JavaScript del navegador.

---

## Justificación Técnica

1. **Arquitectura segura:** El backend es la "fuente de verdad". El frontend es una vista. Patrón universal en software médico.

2. **Escalabilidad:** Cuando en v1.1 agregues una app paciente (móvil) y un módulo de guardia, ambos querrán acceder a las mismas reglas clínicas. Están centralizadas en el servidor.

3. **Testabilidad:** Puedes escribir tests unitarios para `RobCalculationService.calculate()` que son auditable y versionadas en Git. Los tests de JavaScript en el navegador no cuentan.

4. **Interoperabilidad FHIR (futuro):** Cuando en v2.0 integres con otros sistemas vía HL7 FHIR, la lógica clínica tiene que estar en un endpoint de API, no en el DOM de un HTML.

---

## Riesgos Aceptados

| Riesgo | Mitigación | Responsable |
|--------|-----------|------------|
| **Mayor latencia:** Frontend debe esperar respuesta del servidor | Respuestas rápidas (< 200ms) en computadora local. En producción, usar caché + offline-first. | Backend optimización en v1.1 |
| **Dependencia de red:** Si la API falla, el frontend no puede calcular nada | Arquitectura offline-first con IndexedDB. Si no hay conexión, se calcula localmente en caché y se sincroniza después. | Implementado en COM sección 6 |
| **Complejidad de API:** El contrato es más complejo que lógica cliente | Especificación clara (ADRs, API Contract, Prisma schema). | Documentación presente |

---

## Alternativas Consideradas y Rechazadas

### Alternativa A: Lógica Clínica en Frontend (Status Quo antes de esto)
```
Ventajas: Rápido, menos llamadas al servidor, offline por defecto
Desventajas: Violación ISO 14971, sin auditoría, manipulable,
             inconsistente, no escalable
Decisión: RECHAZADA — Riesgo clínico inaceptable
```

### Alternativa B: Lógica compartida (Frontend + Backend)
```
Ventajas: Frontend puede validar antes, mejor UX
Desventajas: Duplicación de código, riesgo de inconsistencia,
             frontend sigue siendo fuente de verdad parcial
Decisión: RECHAZADA — Mantiene riesgo de manipulación
```

### Alternativa C: Lógica SOLO en Backend (SELECCIONADA)
```
Ventajas: Seguro, auditado, escalable, FHIR-ready
Desventajas: +1 request HTTP por consulta, latencia ~200ms
Decisión: SÍ — Riesgo clínico resuelto. Latencia aceptable.
```

---

## Consecuencias Arquitectónicas

### Para el Frontend (`Next.js + TypeScript`)
```typescript
// ❌ ANTES (INCORRECTO)
const eca = calculateECA(vitals); // NUNCA MÁS
console.log('ECA:', eca);

// ✅ AHORA (CORRECTO)
const response = await fetch('/api/consultations', {
  method: 'POST',
  body: JSON.stringify({
    pregnancy_id, gestational_weeks, vital_signs, symptoms
    // NO enviamos "eca_calculated" — el servidor lo hace
  })
});
const { data: { eca_calculated } } = await response.json();
console.log('ECA (desde servidor):', eca_calculated);
```

### Para el Backend (`NestJS`)
```typescript
// ✅ CORRECTO — Lógica clínica en servicio
@Injectable()
export class FasgoRiskService {
  calculateECA(vitals: VitalSigns, rob: RobLevel): EcaResult {
    // Lógica FASGO 2025 aquí
    // Resultado queda en BD
  }
}

@Controller('api/consultations')
@Post()
async create(@Body() dto: CreateConsultationDTO) {
  const eca = this.fasgoRisk.calculateECA(dto.vital_signs, pregnancy.rob_status);
  // ECA es verdad oficial. No venía del cliente.
}
```

### Para la Base de Datos
- Tabla `consultations` tiene columna `eca_calculated` — datos inmutables
- Tabla `clinical_alerts_log` tiene cada alerta generada — auditoría completa
- Log de auditoría ISO 14971 apunta siempre a decisiones del servidor

### Para la Auditoría
```
Pregunta: "¿Por qué se asignó ECA=CRITICAL en Consulta X?"
Respuesta: "Abrimos el log de auditoría, encontramos el timestamp,
           consultamos la tabla clinical_alerts_log, y vemos:
           rule_id='PA_CRITICA_HARD', severity='HARD', 
           PA_sistolica=165, timestamp=2026-03-17T10:30:00Z"
           
Todo es verificable, reproducible, y está en la BD.
```

---

## Implicaciones para Interoperabilidad FHIR (v2.0)

Cuando Gia sea un módulo de un ecosistema Zenoxia más grande:

```
Protocolo HL7 FHIR:
┌─────────────────────┐
│   Sistema Externo   │
└──────────┬──────────┘
           │ POST Bundle[Observation, Condition]
           │
       ┌───▼────────────────────┐
       │  Gia Backend (NestJS)  │
       │  RobCalculationService │
       │  FasgoRiskService      │
       └───┬────────────────────┘
           │ Response: Bundle[Observation, Alert]
           │
      ┌────▼─────────────────┐
      │ Sistema Externo      │
      │ (recibe decisión     │
      │  clínica confiable)  │
      └──────────────────────┘
```

La lógica centralizada en Gia permite que otros módulos confíen en sus decisiones.

---

## Cambios en el Código Git

### Antes (❌ INCORRECTO)
```
gia-frontend/
├── dashboard.html
├── clinical-rules.js  ← ⚠️ Lógica clínica acá (PELIGRO)
└── styles.css
```

### Ahora (✅ CORRECTO)
```
gia-frontend/
├── pages/dashboard.tsx  ← UI, sin lógica clínica
├── components/...      ← Componentes visuales
└── api/consultations.ts ← Apenas fetch() al servidor

gia-api/
├── src/clinical/
│   ├── services/
│   │   ├── rob-calculation.service.ts    ← ✅ Lógica clínica
│   │   └── fasgo-risk.service.ts         ← ✅ Lógica clínica
│   └── matrix/
│       └── field-validation-matrix.ts    ← ✅ Validación condicional
└── src/consultations/
    └── consultations.controller.ts       ← Orquesta servicios
```

---

## Implementación en Sprints

### MVP (Semanas 3-4)
- [ ] `RobCalculationService` en backend
- [ ] `FasgoRiskService` en backend
- [ ] Frontend reemplaza `calculateRisk()` por `fetch(/api/pregnancies)`
- [ ] Tests: Postman valida que servidor es fuente de verdad

### v1.1 (Sprints 5-6)
- [ ] App paciente (móvil) usa mismos endpoints
- [ ] Validación de que ambos clientes obtienen ECA idéntico

### v2.0 (Sprints 8+)
- [ ] HL7 FHIR wrapper que expone RobCalculationService
- [ ] Integración Cordis / Kairos confía en la lógica de Gia

---

## Validación Arquitectónica

Preguntas que un auditor hace:

| Pregunta | Respuesta |
|----------|-----------|
| ¿Quién decide si es un caso de alto riesgo? | Servidor (`RobCalculationService`), guardado en `pregnancies.rob_status` |
| ¿Puede un usuario cambiar el ECA desde DevTools? | No. El ECA se calcula en el servidor y se guarda en BD. DevTools solo puede cambiar lo que ve, no la BD |
| ¿Hay versionado de cambios clínicos? | Sí. `clinical_alerts_log` tiene timestamp y cada alerta. `consultations` es inmutable |
| ¿Puedo confiar en que dos clientes calcularán lo mismo? | Sí. Ambos consultan el mismo servidor, misma lógica |

---

## Tracking

| Aspecto | Estado | Evidencia |
|--------|--------|-----------|
| Decisión de arquitectura | ✅ Aprobada | Este ADR |
| Especificación API | ✅ Documentada | `Gia_API_Contract_MVP.md` |
| Código backend | ✅ En dev | `RobCalculationService`, `FasgoRiskService` |
| Código frontend | ⏳ Semana 5 | Cambio de `window.giaPatients.push()` a `fetch()` |
| Testing | ⏳ Semana 4 | Postman valida respuestas |

---

## Referencias

- **COM:** Sección 5 "Modelo de Auditoría"
- **API Contract:** Sección "El Frontend NUNCA calcula ROB ni ECA"
- **Prisma Schema:** Tablas `consultation`, `clinical_alerts_log`
- **Backend Checklist:** Semana 3 `RobCalculationService`, Semana 4 `FasgoRiskService`
- **ISO 14971:** Software validation, hazard analysis, traceability

---

**Aprobado por:** Product Owner (clínico) + Arquitecto Full Stack  
**Fecha de efectividad:** Viernes, Semana 2 (final de arquitectura)  
**Revisión siguiente:** v1.1 para considerar Event Sourcing si es necesario
