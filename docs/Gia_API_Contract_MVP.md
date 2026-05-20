# Gia MVP — API Contract v1.0

**Autoridad:** Clinical Operational Model (COM) — Fuente Única de Verdad  
**Fecha:** Mayo 2026  
**Stack:** NestJS + PostgreSQL + Prisma  

---

## Principios Fundamentales

1. **El Frontend NUNCA calcula ROB ni ECA.** Solo ingresa datos.
2. **El Backend SIEMPRE es fuente de verdad clínica.** ROB calculado una sola vez. ECA recalculado en cada consulta.
3. **Toda respuesta incluye `success` y `data`** o `success: false` con `error`.
4. **Todas las respuestas usan HTTP 201 (Created) o 200 (OK).**
5. **Errores clínicos devuelven 400 Bad Request con mensaje específico.**

---

## Endpoint 1: Crear Paciente y Embarazo

### `POST /api/pregnancies`

**Propósito:**  
Crear una paciente nueva (si no existe) y registrar su embarazo actual. El backend calcula el ROB basado en antecedentes y lo guarda como inmutable.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer dev-token-123  (o x-api-key: dev-obstetra-123 para MVP)
```

### Request Body

```json
{
  "patient": {
    "first_name": "Romina",
    "last_name": "Lencinas",
    "national_id": "959595955",
    "birth_date": "1983-08-27",
    "phone": "+5491123456789",
    "health_ins": "OSDE",
    "blood_type": "A+"
  },
  "pregnancy": {
    "fum": "2026-02-10",
    "fpp": "2026-11-17",
    "formula_g": 3,
    "formula_p": 2,
    "formula_a": 0,
    "formula_c": 1
  },
  "antecedents": {
    "hta_cronica": true,
    "diabetes_previa": false,
    "preeclampsia_previa": false,
    "imc_inicial": 31.2,
    "edad_al_embarazo": 42,
    "lupus": false,
    "trombofilia": false
  }
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440000",
    "pregnancy_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "rob_calculated": "ALTO",
    "rob_justification": [
      "Edad de riesgo (42 años)",
      "Hipertensión crónica",
      "Obesidad (IMC 31.2)"
    ],
    "message": "Paciente y embarazo creados exitosamente. ROB asignado: ALTO"
  }
}
```

### Response (400 Bad Request — Validación fallida)

```json
{
  "success": false,
  "error": "DNI ya existe en el sistema. Si es la misma paciente, cree un nuevo embarazo usando POST /api/pregnancies/{patient_id}/new-pregnancy",
  "code": "PATIENT_EXISTS"
}
```

---

## Endpoint 2: Cargar Consulta Prenatal

### `POST /api/consultations`

**Propósito:**  
Registrar una consulta de seguimiento. El backend:
1. Busca el embarazo en la BD (con su ROB inmutable)
2. Valida campos obligatorios según la matriz condicional (ROB + EGA)
3. Calcula ECA usando FasgoRiskService
4. Genera alertas según FASGO 2025
5. Guarda todo y retorna ECA + alertas

**Headers:**
```
Content-Type: application/json
Authorization: Bearer dev-token-123
```

### Request Body

```json
{
  "pregnancy_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "gestational_weeks": 28,
  "vital_signs": {
    "weight_kg": 72.5,
    "blood_pressure_systolic": 140,
    "blood_pressure_diastolic": 90,
    "fetal_heart_rate_bpm": 145,
    "uterine_height_cm": 27,
    "proteinuria": "Trazas"
  },
  "symptoms": {
    "edema": true,
    "headache": false,
    "vision_changes": false,
    "contractions": false,
    "bleeding": false,
    "amniotic_fluid_loss": false
  },
  "clinical_notes": "Paciente refiere edema leve de MMII. Sem pié derecho ligeramente mayor que izquierdo. Presión TA 140/90 — solicitar laboratorio.",
  "conduct_taken": "solicita_estudios",
  "next_control_date": "2026-03-24"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "consultation_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "eca_calculated": "ALERT",
    "eca_calculated_at": "2026-03-17T10:30:00Z",
    "triggered_alerts": [
      {
        "rule_id": "HTA_MODERADA",
        "message": "Presión arterial ≥140/90 mmHg en una medición. Solicitar laboratorio (PT, creatinina, LDH).",
        "severity": "MODERATE"
      },
      {
        "rule_id": "PROTEINURIA_TRAZAS",
        "message": "Primera aparición de proteinuria. Monitoreo intensivo recomendado.",
        "severity": "INFORMATIVE"
      }
    ],
    "message": "Consulta guardada. ECA: ALERT. 2 alertas generadas."
  }
}
```

### Response (400 Bad Request — Validación fallida)

#### Caso 1: Embarazo no existe
```json
{
  "success": false,
  "error": "Embarazo no encontrado",
  "code": "PREGNANCY_NOT_FOUND",
  "pregnancy_id": "invalid-uuid"
}
```

#### Caso 2: Campo obligatorio faltante (por ROB)
```json
{
  "success": false,
  "error": "Campo proteinuria es obligatorio para ROB=MODERADO",
  "code": "MISSING_REQUIRED_FIELD",
  "field": "proteinuria",
  "reason": "Este ROB requiere proteinuria"
}
```

#### Caso 3: Valor fuera de rango fisiológico
```json
{
  "success": false,
  "error": "PA sistólica 280 está fuera de rango válido (60-220)",
  "code": "INVALID_VALUE",
  "field": "blood_pressure_systolic",
  "valid_range": [60, 220]
}
```

---

## Matriz de Condicionalidad Clínica (Backend)

El backend valida esto automáticamente antes de guardar. El frontend NO necesita conocerla, pero está aquí para referencia del Product Owner.

| Campo | ROB BAJO | ROB MODERADO | ROB ALTO | Validación |
|-------|----------|-------------|---------|-----------|
| Peso | REQ | REQ | REQ | Siempre. Zod 30-200 kg |
| PA (sistólica/diastólica) | REQ | REQ | REQ | Siempre. Zod 60-220 / 40-140 |
| EGA | REQ | REQ | REQ | Siempre. Zod 4-44 semanas |
| FCF | EGA > 12w | EGA > 12w | REQ | ROB Alto: obligatorio siempre |
| Proteinuria | OPT | REQ | REQ | ROB Moderado/Alto: obligatorio |
| Edemas | OPT | OPT | REQ | ROB Alto: obligatorio (o "ausentes") |
| Síntomas alarma (checks) | OPT | REQ | REQ | ROB Moderado/Alto: ≥1 check |
| Altura uterina | OPT | OPT | OPT | Recomendado si EGA > 20w |

---

## Reglas de Cálculo del ECA (Backend)

El FasgoRiskService calcula el ECA según estos criterios (FASGO 2025):

### ECA = STABLE
- Todos los valores dentro de rango normal
- Presión arterial < 140/90
- Proteinuria negativa
- Sin síntomas de alarma
- Tendencia estable (PA no subió ≥10 mmHg vs consulta anterior)

### ECA = WATCHFUL
- PA aumentó ≥10 mmHg sistólica vs consulta anterior (pero < 140)
- Ganancia de peso > 500g en 7 días
- Proteinuria trazas (nueva)
- Un síntoma de alarma aislado sin signo objetivo

### ECA = ALERT
- PA ≥140/90 en una medición (sin proteinuria)
- Proteinuria 1+ (sin PA crítica)
- Ganancia de peso > 1 kg en 7 días
- Dos o más síntomas de alarma simultáneos
- Dos alertas informativas en la misma semana

### ECA = CRITICAL
- PA ≥160/110 (criterio ACOG severidad)
- PA ≥140/90 + proteinuria ≥2+ (criterios diagnósticos preeclampsia)
- PA ≥140/90 + (cefalea O fosfenos O epigastralgia) (severidad)
- FCF < 100 o > 180 lpm

---

## Detalles de Implementación para el Dev

### `RobCalculationService`

```typescript
// src/clinical/services/rob-calculation.service.ts
import { Injectable } from '@nestjs/common';

interface AntecedentsInput {
  hta_cronica?: boolean;
  diabetes_previa?: boolean;
  preeclampsia_previa?: boolean;
  imc_inicial?: number;
  edad_al_embarazo?: number;
  lupus?: boolean;
  trombofilia?: boolean;
}

interface RobResult {
  rob_status: 'BAJO' | 'MODERADO' | 'ALTO';
  justification: string[];
}

@Injectable()
export class RobCalculationService {
  calculate(antecedents: AntecedentsInput, ageAtPregnancy: number): RobResult {
    const justification: string[] = [];
    let robLevel = 'BAJO';

    // Edad de riesgo
    if (ageAtPregnancy >= 35) {
      justification.push(`Edad de riesgo (${ageAtPregnancy} años)`);
      robLevel = 'MODERADO';
    }

    // HTA crónica
    if (antecedents.hta_cronica) {
      justification.push('Hipertensión crónica');
      if (robLevel === 'BAJO') robLevel = 'MODERADO';
      else robLevel = 'ALTO'; // Si ya es MODERADO, sube a ALTO
    }

    // Diabetes previa
    if (antecedents.diabetes_previa) {
      justification.push('Diabetes previa');
      robLevel = 'ALTO';
    }

    // Preeclampsia previa severa
    if (antecedents.preeclampsia_previa) {
      justification.push('Antecedente de preeclampsia');
      robLevel = 'ALTO';
    }

    // Obesidad
    if ((antecedents.imc_inicial || 0) > 30) {
      justification.push(`Obesidad (IMC ${antecedents.imc_inicial})`);
      if (robLevel === 'BAJO') robLevel = 'MODERADO';
      else robLevel = 'ALTO';
    }

    // Lupus / Trombofilia
    if (antecedents.lupus || antecedents.trombofilia) {
      justification.push('Enfermedad autoinmune / Trombofilia');
      robLevel = 'ALTO';
    }

    return {
      rob_status: robLevel as 'BAJO' | 'MODERADO' | 'ALTO',
      justification: justification.length > 0 ? justification : ['Sin factores de riesgo identificados']
    };
  }
}
```

### `FasgoRiskService`

```typescript
// src/clinical/services/fasgo-risk.service.ts
import { Injectable } from '@nestjs/common';
import { Consultation } from '@prisma/client';

interface VitalSigns {
  weight_kg: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  fetal_heart_rate_bpm?: number;
  proteinuria?: string;
}

interface EcaResult {
  eca: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL';
  triggered_rules: string[];
}

@Injectable()
export class FasgoRiskService {
  calculateECA(vitals: VitalSigns, previousConsultation?: Consultation): EcaResult {
    const triggered_rules: string[] = [];
    let eca: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL' = 'STABLE';

    // CRÍTICO: PA ≥160/110
    if (vitals.blood_pressure_systolic >= 160 || vitals.blood_pressure_diastolic >= 110) {
      triggered_rules.push('PA_CRITICA_HARD');
      eca = 'CRITICAL';
      return { eca, triggered_rules };
    }

    // CRÍTICO: PA ≥140/90 + Proteinuria ≥2+
    if ((vitals.blood_pressure_systolic >= 140 || vitals.blood_pressure_diastolic >= 90) && 
        (vitals.proteinuria === '2+' || vitals.proteinuria === '3+' || vitals.proteinuria === '4+')) {
      triggered_rules.push('PREECLAMPSIA_DIAGNOSTICO');
      eca = 'CRITICAL';
      return { eca, triggered_rules };
    }

    // ALERTA: PA ≥140/90
    if (vitals.blood_pressure_systolic >= 140 || vitals.blood_pressure_diastolic >= 90) {
      triggered_rules.push('HTA_MODERADA');
      eca = 'ALERT';
    }

    // ALERTA: Proteinuria 1+
    if (vitals.proteinuria === '1+') {
      triggered_rules.push('PROTEINURIA_1PLUS');
      eca = 'ALERT';
    }

    // VIGILANCIA: Proteinuria trazas (nueva)
    if (vitals.proteinuria === 'Trazas' && (!previousConsultation || !previousConsultation.proteinuria)) {
      triggered_rules.push('PROTEINURIA_NUEVA');
      if (eca === 'STABLE') eca = 'WATCHFUL';
    }

    return { eca, triggered_rules };
  }
}
```

---

## Errores Comunes a Evitar

| ❌ Incorrecto | ✅ Correcto |
|---|---|
| Frontend envía `eca_calculated: "ALERT"` | Frontend envía solo datos; backend lo calcula |
| Backend devuelve `rob_status` sin `rob_justification` | Siempre incluir justificación (auditoría) |
| No validar que proteinuria esté en lista permitida | Usar enum o validación exhaustiva en Zod |
| Permitir crear dos embarazos activos simultáneamente | Solo un embarazo `active=true` por paciente |
| Modificar ROB después de crearlo | ROB es inmutable; registrar cambios en `clinical_notes` |

---

## Testing Manual con Postman

### Test 1: Crear Paciente (ROB=ALTO)
```
POST http://localhost:3000/api/pregnancies
Body: (usar JSON de Request arriba con HTA crónica + edad > 35)
Esperado: 201 Created, rob_calculated: "ALTO"
```

### Test 2: Cargar Consulta (ECA=ALERT)
```
POST http://localhost:3000/api/consultations
Body: (usar JSON de Request, PA=140/90)
Esperado: 201 Created, eca_calculated: "ALERT", alerts con HTA_MODERADA
```

### Test 3: Validación falla (Proteinuria obligatoria en ROB=MODERADO)
```
POST http://localhost:3000/api/consultations
Body: (sin proteinuria, ROB=MODERADO)
Esperado: 400 Bad Request, "proteinuria es obligatorio"
```

---

## Próximos Pasos

1. **Dev:** Implementar según checklist Weeks 3-4
2. **PO:** Revisar cada endpoint en Postman (Viernes Semana 4)
3. **Frontend:** Cambiar `window.giaPatients.push()` a `fetch()` (Semana 5)
4. **Obstetra:** Primera prueba con datos reales (Semana 7)
