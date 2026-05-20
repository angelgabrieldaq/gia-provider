# Gia MVP — Backend Development Checklist
## Semanas 3 y 4 — La Biblia de la Ejecución

**Autoridad:** Este documento es la fuente única de verdad para el desarrollo. Si no está aquí, no se programa.

**Equipo:** Dev Full Stack Senior  
**Plazo:** 10 días calendario (Lunes Semana 3 → Viernes Semana 4)  
**Objetivo:** Dos endpoints funcionales testeados en Postman + BD en PostgreSQL

---

## Regla Cero: Autenticación (No Real)

**Para el MVP, NO gastes tiempo en login, bcrypt, reseteos de password.**

Usa **UN guard estático** en NestJS:

```typescript
// src/auth/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (token === 'dev-obstetra-123') return true;
    throw new UnauthorizedException('Token inválido');
  }
}
```

**Frontend envía:**
```
Authorization: Bearer dev-obstetra-123
```

**Listo.** Punto. Sin más.

---

# SEMANA 3: Infraestructura + ROB

## Lunes — Infraestructura

### Tareas

- [ ] **Crear `docker-compose.yml`** con PostgreSQL 16 + NestJS
- [ ] **Inicializar proyecto NestJS**
  ```bash
  npm install -g @nestjs/cli
  nest new gia-api
  cd gia-api
  npm install prisma @prisma/client zod class-validator
  ```
- [ ] **Crear `.env.local`**
  ```
  DATABASE_URL="postgresql://user:password@localhost:5432/gia_dev"
  NODE_ENV="development"
  ```
- [ ] **Levantar Docker**
  ```bash
  docker-compose up -d
  ```

### Docker Compose (Copiar y pegar)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: gia_postgres
    environment:
      POSTGRES_USER: gia_user
      POSTGRES_PASSWORD: gia_pass
      POSTGRES_DB: gia_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gia_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./gia-api
      dockerfile: Dockerfile
    container_name: gia_api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://gia_user:gia_pass@postgres:5432/gia_dev"
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./gia-api:/app
      - /app/node_modules

volumes:
  postgres_data:
```

### Dockerfile (para gia-api)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
```

### Resultado esperado (Viernes)

- [ ] `docker-compose up` levanta sin errores
- [ ] PostgreSQL escucha en puerto 5432
- [ ] NestJS levanta en puerto 3000 (GET http://localhost:3000 devuelve 404 — está bien)

---

## Martes — Base de Datos

### Tareas

- [ ] **Copiar el archivo `Gia_Prisma_Schema_MVP.prisma` al proyecto**
  ```bash
  cp Gia_Prisma_Schema_MVP.prisma gia-api/prisma/schema.prisma
  ```

- [ ] **Inicializar Prisma**
  ```bash
  cd gia-api
  npx prisma init
  # Reemplaza el schema.prisma con el que te pasamos
  ```

- [ ] **Crear y ejecutar migración**
  ```bash
  npx prisma migrate dev --name init
  # Esto crea todas las tablas en PostgreSQL
  ```

- [ ] **Generar cliente Prisma**
  ```bash
  npx prisma generate
  ```

- [ ] **Verificar tablas en PostgreSQL**
  ```bash
  psql -U gia_user -d gia_dev -h localhost
  \dt
  # Debe mostrar: patients, pregnancies, consultations, clinical_alerts_log
  ```

### Resultado esperado

- [ ] Tabla `patients` existe con columnas: id, national_id, first_name, last_name, birth_date, phone, health_ins, blood_type, created_at, updated_at
- [ ] Tabla `pregnancies` existe con: id, patient_id, fum, fpp, formula_g/p/a/c, raw_antecedents (JSON), rob_status (enum), rob_justification (array), active, created_at, updated_at
- [ ] Tabla `consultations` existe con 20+ columnas de vitales y síntomas
- [ ] Tabla `clinical_alerts_log` existe con: id, consultation_id, rule_id, message, severity, created_at
- [ ] `npx prisma db push` sin errores

---

## Miércoles — RobCalculationService

### Tareas

- [ ] **Crear servicio**
  ```bash
  nest generate service clinical/services/rob-calculation
  ```

- [ ] **Implementar lógica** (ver código abajo)

- [ ] **Escribir tests unitarios** (opcional pero recomendado)
  ```bash
  npm test -- rob-calculation.service
  ```

### Código a implementar

```typescript
// src/clinical/services/rob-calculation.service.ts

import { Injectable } from '@nestjs/common';

export interface AntecedentsInput {
  hta_cronica?: boolean;
  diabetes_previa?: boolean;
  preeclampsia_previa?: boolean;
  imc_inicial?: number;
  edad_al_embarazo?: number;
  lupus?: boolean;
  trombofilia?: boolean;
}

export interface RobResult {
  rob_status: 'BAJO' | 'MODERADO' | 'ALTO';
  justification: string[];
}

@Injectable()
export class RobCalculationService {
  
  calculate(antecedents: AntecedentsInput, ageAtPregnancy: number): RobResult {
    const justification: string[] = [];
    let robLevel: 'BAJO' | 'MODERADO' | 'ALTO' = 'BAJO';

    // Edad de riesgo ≥ 35
    if (ageAtPregnancy >= 35) {
      justification.push(`Edad de riesgo (${ageAtPregnancy} años)`);
      robLevel = 'MODERADO';
    }

    // HTA crónica — escalones el nivel
    if (antecedents.hta_cronica) {
      justification.push('Hipertensión crónica');
      // Si ya es MODERADO, sube a ALTO. Si es BAJO, sube a MODERADO.
      robLevel = robLevel === 'BAJO' ? 'MODERADO' : 'ALTO';
    }

    // Diabetes previa — directo a ALTO
    if (antecedents.diabetes_previa) {
      justification.push('Diabetes previa');
      robLevel = 'ALTO';
    }

    // Preeclampsia previa — directo a ALTO
    if (antecedents.preeclampsia_previa) {
      justification.push('Antecedente de preeclampsia');
      robLevel = 'ALTO';
    }

    // Obesidad (IMC > 30)
    if ((antecedents.imc_inicial || 0) > 30) {
      justification.push(`Obesidad (IMC ${antecedents.imc_inicial})`);
      robLevel = robLevel === 'BAJO' ? 'MODERADO' : 'ALTO';
    }

    // Lupus / Trombofilia — directo a ALTO
    if (antecedents.lupus || antecedents.trombofilia) {
      justification.push('Enfermedad autoinmune / Trombofilia');
      robLevel = 'ALTO';
    }

    // Si no hay justificación, es BAJO sin factores
    if (justification.length === 0) {
      justification.push('Sin factores de riesgo identificados');
    }

    return {
      rob_status: robLevel,
      justification
    };
  }
}
```

### Resultado esperado

- [ ] El servicio existe en `src/clinical/services/rob-calculation.service.ts`
- [ ] `calculate()` devuelve un objeto con `rob_status` y `justification`
- [ ] Test manual:
  ```typescript
  const service = new RobCalculationService();
  const result = service.calculate(
    { hta_cronica: true, edad_al_embarazo: 42 },
    42
  );
  console.log(result); // { rob_status: 'ALTO', justification: ['...', '...'] }
  ```

---

## Jueves — POST /api/pregnancies (Endpoint 1)

### Tareas

- [ ] **Crear módulo pregnancies**
  ```bash
  nest generate module pregnancies
  nest generate controller pregnancies/pregnancies
  nest generate service pregnancies/pregnancies
  ```

- [ ] **Crear DTO y validación Zod**
  ```bash
  mkdir -p src/pregnancies/dto
  ```

- [ ] **Implementar controlador** (ver código abajo)

- [ ] **Inyectar RobCalculationService**

- [ ] **Probar en Postman**

### Código a implementar

**DTO (src/pregnancies/dto/create-pregnancy.dto.ts):**

```typescript
import { z } from 'zod';

export const CreatePregnancySchema = z.object({
  patient: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    national_id: z.string().min(1),
    birth_date: z.string().datetime(),
    phone: z.string().optional(),
    health_ins: z.string().optional(),
    blood_type: z.string().optional(),
  }),
  pregnancy: z.object({
    fum: z.string().datetime(),
    fpp: z.string().datetime().optional(),
    formula_g: z.number().int().min(0).optional(),
    formula_p: z.number().int().min(0).optional(),
    formula_a: z.number().int().min(0).optional(),
    formula_c: z.number().int().min(0).optional(),
  }),
  antecedents: z.object({
    hta_cronica: z.boolean().default(false),
    diabetes_previa: z.boolean().default(false),
    preeclampsia_previa: z.boolean().default(false),
    imc_inicial: z.number().optional(),
    edad_al_embarazo: z.number().int().min(15).max(55),
    lupus: z.boolean().default(false),
    trombofilia: z.boolean().default(false),
  }),
});

export type CreatePregnancyInput = z.infer<typeof CreatePregnancySchema>;
```

**Controlador (src/pregnancies/pregnancies.controller.ts):**

```typescript
import { Controller, Post, Body, UseGuards, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RobCalculationService } from '../clinical/services/rob-calculation.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreatePregnancySchema, CreatePregnancyInput } from './dto/create-pregnancy.dto';

@Controller('api/pregnancies')
@UseGuards(AuthGuard)
export class PregnanciesController {
  constructor(
    private prisma: PrismaService,
    private robCalc: RobCalculationService,
  ) {}

  @Post()
  async createPregnancy(@Body() body: any) {
    // Validar con Zod
    let input: CreatePregnancyInput;
    try {
      input = CreatePregnancySchema.parse(body);
    } catch (error: any) {
      throw new BadRequestException(`Validación falló: ${error.message}`);
    }

    // Buscar si la paciente ya existe
    const existingPatient = await this.prisma.patient.findUnique({
      where: { national_id: input.patient.national_id },
    });

    if (existingPatient) {
      throw new ConflictException(
        'DNI ya existe en el sistema. Si es la misma paciente, cree un nuevo embarazo usando POST /api/pregnancies/{patient_id}/new-pregnancy',
      );
    }

    // Calcular ROB
    const robResult = this.robCalc.calculate(
      input.antecedents,
      input.antecedents.edad_al_embarazo,
    );

    // Crear paciente y embarazo en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear paciente
      const patient = await tx.patient.create({
        data: {
          first_name: input.patient.first_name,
          last_name: input.patient.last_name,
          national_id: input.patient.national_id,
          birth_date: new Date(input.patient.birth_date),
          phone: input.patient.phone,
          health_ins: input.patient.health_ins,
          blood_type: input.patient.blood_type,
        },
      });

      // 2. Crear embarazo (inmutable ROB)
      const pregnancy = await tx.pregnancy.create({
        data: {
          patient_id: patient.id,
          fum: new Date(input.pregnancy.fum),
          fpp: input.pregnancy.fpp ? new Date(input.pregnancy.fpp) : null,
          formula_g: input.pregnancy.formula_g,
          formula_p: input.pregnancy.formula_p,
          formula_a: input.pregnancy.formula_a,
          formula_c: input.pregnancy.formula_c,
          raw_antecedents: input.antecedents,
          rob_status: robResult.rob_status,
          rob_justification: robResult.justification,
        },
      });

      return { patient, pregnancy };
    });

    return {
      success: true,
      data: {
        patient_id: result.patient.id,
        pregnancy_id: result.pregnancy.id,
        rob_calculated: result.pregnancy.rob_status,
        rob_justification: result.pregnancy.rob_justification,
        message: `Paciente y embarazo creados exitosamente. ROB asignado: ${result.pregnancy.rob_status}`,
      },
    };
  }
}
```

### Resultado esperado (Viernes)

- [ ] Postman: `POST http://localhost:3000/api/pregnancies`
- [ ] Request:
  ```json
  {
    "patient": { "first_name": "Romina", "last_name": "Lencinas", ... },
    "pregnancy": { "fum": "2026-02-10", ... },
    "antecedents": { "hta_cronica": true, "edad_al_embarazo": 42, ... }
  }
  ```
- [ ] Response (201):
  ```json
  {
    "success": true,
    "data": {
      "patient_id": "uuid",
      "pregnancy_id": "uuid",
      "rob_calculated": "ALTO",
      "rob_justification": ["Edad de riesgo (42 años)", "Hipertensión crónica"]
    }
  }
  ```
- [ ] Base de datos: paciente y embarazo guardados con `rob_status = 'ALTO'`

---

# SEMANA 4: Consultas + ECA

## Lunes — Matriz de Validación Condicional

### Tareas

- [ ] **Crear archivo de matriz**
  ```bash
  mkdir -p src/clinical/matrix
  touch src/clinical/matrix/field-validation-matrix.ts
  ```

- [ ] **Implementar la matriz** (ver código abajo)

### Código a implementar

```typescript
// src/clinical/matrix/field-validation-matrix.ts

import { RobLevel } from '@prisma/client';

export interface ValidationContext {
  rob: RobLevel;
  ega: number; // Semanas gestacionales
}

export interface FieldValidationRule {
  field: string;
  required: (ctx: ValidationContext) => boolean;
  reason: string;
}

export const FieldValidationMatrix: FieldValidationRule[] = [
  {
    field: 'gestational_weeks',
    required: () => true,
    reason: 'Siempre obligatorio',
  },
  {
    field: 'weight_kg',
    required: () => true,
    reason: 'Siempre obligatorio',
  },
  {
    field: 'blood_pressure_systolic',
    required: () => true,
    reason: 'Siempre obligatorio',
  },
  {
    field: 'blood_pressure_diastolic',
    required: () => true,
    reason: 'Siempre obligatorio',
  },
  {
    field: 'fetal_heart_rate_bpm',
    required: (ctx) => ctx.rob === 'ALTO' || ctx.ega > 12,
    reason: 'Obligatorio si ROB=ALTO o EGA > 12 semanas',
  },
  {
    field: 'proteinuria',
    required: (ctx) => ctx.rob === 'MODERADO' || ctx.rob === 'ALTO',
    reason: 'Obligatorio si ROB=MODERADO o ALTO',
  },
  {
    field: 'symp_edema',
    required: (ctx) => ctx.rob === 'ALTO',
    reason: 'Obligatorio si ROB=ALTO (al menos registrar como ausente)',
  },
  {
    field: 'symp_headache',
    required: (ctx) => ctx.rob === 'MODERADO' || ctx.rob === 'ALTO',
    reason: 'Obligatorio si ROB=MODERADO o ALTO',
  },
  {
    field: 'symp_vision_changes',
    required: (ctx) => ctx.rob === 'MODERADO' || ctx.rob === 'ALTO',
    reason: 'Obligatorio si ROB=MODERADO o ALTO',
  },
  {
    field: 'uterine_height_cm',
    required: (ctx) => ctx.ega > 20,
    reason: 'Obligatorio si EGA > 20 semanas',
  },
];

export function validateConsultationFields(
  body: any,
  context: ValidationContext,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of FieldValidationMatrix) {
    if (rule.required(context)) {
      const value = body[rule.field];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        errors.push(`${rule.field} es requerido: ${rule.reason}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Resultado esperado

- [ ] Archivo `field-validation-matrix.ts` creado
- [ ] Función `validateConsultationFields()` lista para usar en el controlador

---

## Martes — FasgoRiskService (ECA + Alertas)

### Tareas

- [ ] **Crear servicio**
  ```bash
  nest generate service clinical/services/fasgo-risk
  ```

- [ ] **Implementar lógica** (ver código abajo)

### Código a implementar

```typescript
// src/clinical/services/fasgo-risk.service.ts

import { Injectable } from '@nestjs/common';
import { Consultation } from '@prisma/client';
import { RobLevel } from '@prisma/client';

export interface VitalSigns {
  weight_kg: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  fetal_heart_rate_bpm?: number;
  proteinuria?: string;
  symp_edema?: boolean;
  symp_headache?: boolean;
  symp_vision_changes?: boolean;
  symp_contractions?: boolean;
  symp_bleeding?: boolean;
  symp_amniotic_fluid_loss?: boolean;
}

export interface AlertTriggered {
  rule_id: string;
  message: string;
  severity: 'INFORMATIVE' | 'MODERATE' | 'HARD' | 'SOFT';
}

export interface EcaResult {
  eca: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL';
  alerts: AlertTriggered[];
}

@Injectable()
export class FasgoRiskService {
  
  calculateECA(
    vitals: VitalSigns,
    robStatus: RobLevel,
    previousConsultation?: Consultation,
  ): EcaResult {
    const alerts: AlertTriggered[] = [];
    let eca: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL' = 'STABLE';

    // ========================================================================
    // CRÍTICO HARD: PA ≥160/110 (ACOG severe range)
    // ========================================================================
    if (vitals.blood_pressure_systolic >= 160 || vitals.blood_pressure_diastolic >= 110) {
      alerts.push({
        rule_id: 'PA_CRITICA_HARD',
        message: `Presión arterial crítica (${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic} mmHg). Requiere confirmación inmediata y conducta urgente.`,
        severity: 'HARD',
      });
      eca = 'CRITICAL';
      return { eca, alerts }; // Retornar inmediatamente
    }

    // ========================================================================
    // CRÍTICO HARD: FCF fuera de rango (< 100 o > 180 lpm)
    // ========================================================================
    if (vitals.fetal_heart_rate_bpm && (vitals.fetal_heart_rate_bpm < 100 || vitals.fetal_heart_rate_bpm > 180)) {
      alerts.push({
        rule_id: 'FCF_CRITICA',
        message: `FCF fuera de rango (${vitals.fetal_heart_rate_bpm} lpm). Normal: 100-180.`,
        severity: 'HARD',
      });
      eca = 'CRITICAL';
      return { eca, alerts };
    }

    // ========================================================================
    // CRÍTICO HARD: PA ≥140/90 + Proteinuria ≥2+
    // ========================================================================
    if (
      (vitals.blood_pressure_systolic >= 140 || vitals.blood_pressure_diastolic >= 90) &&
      vitals.proteinuria &&
      ['2+', '3+', '4+'].includes(vitals.proteinuria)
    ) {
      alerts.push({
        rule_id: 'PREECLAMPSIA_DIAGNOSTICO',
        message: `Criterios diagnósticos de preeclampsia: PA ≥140/90 + Proteinuria ≥2+. Requiere confirmación y conducta inmediata.`,
        severity: 'HARD',
      });
      eca = 'CRITICAL';
      return { eca, alerts };
    }

    // ========================================================================
    // ALERTA MODERADA: PA ≥140/90 (sin proteinuria crítica)
    // ========================================================================
    if (vitals.blood_pressure_systolic >= 140 || vitals.blood_pressure_diastolic >= 90) {
      alerts.push({
        rule_id: 'HTA_MODERADA',
        message: `Presión arterial ≥140/90 mmHg. Solicitar laboratorio (PT, creatinina, LDH).`,
        severity: 'MODERATE',
      });
      eca = 'ALERT';
    }

    // ========================================================================
    // ALERTA MODERADA: Proteinuria 1+
    // ========================================================================
    if (vitals.proteinuria === '1+') {
      alerts.push({
        rule_id: 'PROTEINURIA_1PLUS',
        message: `Proteinuria 1+. Monitoreo intensivo recomendado.`,
        severity: 'MODERATE',
      });
      eca = 'ALERT';
    }

    // ========================================================================
    // ALERTA INFORMATIVA: Proteinuria trazas (nueva)
    // ========================================================================
    if (vitals.proteinuria === 'Trazas' && (!previousConsultation || !previousConsultation.proteinuria)) {
      alerts.push({
        rule_id: 'PROTEINURIA_NUEVA',
        message: `Primera aparición de proteinuria. Revisar próxima consulta.`,
        severity: 'INFORMATIVE',
      });
      if (eca === 'STABLE') eca = 'WATCHFUL';
    }

    // ========================================================================
    // VIGILANCIA: PA aumentó ≥10 mmHg sistólica vs anterior
    // ========================================================================
    if (previousConsultation && previousConsultation.blood_pressure_systolic) {
      const delta = vitals.blood_pressure_systolic - previousConsultation.blood_pressure_systolic;
      if (delta >= 10) {
        alerts.push({
          rule_id: 'PA_AUMENTO_10',
          message: `Presión sistólica aumentó ${delta} mmHg vs consulta anterior.`,
          severity: 'INFORMATIVE',
        });
        if (eca === 'STABLE') eca = 'WATCHFUL';
      }
    }

    // ========================================================================
    // VIGILANCIA: Ganancia de peso > 500g en 7 días
    // ========================================================================
    if (previousConsultation && previousConsultation.weight_kg) {
      const daysDiff = Math.floor(
        (new Date().getTime() - previousConsultation.created_at.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysDiff <= 7) {
        const weightDelta = vitals.weight_kg - previousConsultation.weight_kg;
        if (weightDelta > 0.5) {
          alerts.push({
            rule_id: 'PESO_AUMENTO_500G',
            message: `Ganancia de peso ${(weightDelta * 1000).toFixed(0)}g en ${daysDiff} días. Revisar retención de líquidos.`,
            severity: 'INFORMATIVE',
          });
          if (eca === 'STABLE') eca = 'WATCHFUL';
        }
      }
    }

    return { eca, alerts };
  }
}
```

### Resultado esperado

- [ ] FasgoRiskService existe y `calculateECA()` funciona
- [ ] Test manual: enviar vitales con PA=150/95, debe devolver ECA=ALERT + alerta HTA_MODERADA

---

## Miércoles — POST /api/consultations (Endpoint 2)

### Tareas

- [ ] **Crear módulo consultations**
  ```bash
  nest generate module consultations
  nest generate controller consultations/consultations
  nest generate service consultations/consultations
  ```

- [ ] **Crear DTO y validación Zod**

- [ ] **Implementar controlador** (ver código abajo)

- [ ] **Inyectar FasgoRiskService y matriz de validación**

### Código a implementar

**DTO (src/consultations/dto/create-consultation.dto.ts):**

```typescript
import { z } from 'zod';

export const CreateConsultationSchema = z.object({
  pregnancy_id: z.string().uuid(),
  gestational_weeks: z.number().int().min(4).max(42),
  vital_signs: z.object({
    weight_kg: z.number().min(30).max(200),
    blood_pressure_systolic: z.number().int().min(50).max(300),
    blood_pressure_diastolic: z.number().int().min(30).max(200),
    fetal_heart_rate_bpm: z.number().int().min(0).max(250).optional(),
    uterine_height_cm: z.number().int().min(0).max(60).optional(),
    proteinuria: z.enum(['Negativa', 'Trazas', '1+', '2+', '3+', '4+']).optional(),
  }),
  symptoms: z.object({
    edema: z.boolean().default(false),
    headache: z.boolean().default(false),
    vision_changes: z.boolean().default(false),
    contractions: z.boolean().default(false),
    bleeding: z.boolean().default(false),
    amniotic_fluid_loss: z.boolean().default(false),
  }),
  clinical_notes: z.string().optional(),
  conduct_taken: z.enum(['continúa_seguimiento', 'solicita_estudios', 'ajusta_medicación', 'deriva', 'interna']).optional(),
  next_control_date: z.string().datetime().optional(),
});

export type CreateConsultationInput = z.infer<typeof CreateConsultationSchema>;
```

**Controlador (src/consultations/consultations.controller.ts):**

```typescript
import { Controller, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FasgoRiskService } from '../clinical/services/fasgo-risk.service';
import { validateConsultationFields } from '../clinical/matrix/field-validation-matrix';
import { AuthGuard } from '../auth/auth.guard';
import { CreateConsultationSchema, CreateConsultationInput } from './dto/create-consultation.dto';

@Controller('api/consultations')
@UseGuards(AuthGuard)
export class ConsultationsController {
  constructor(
    private prisma: PrismaService,
    private fasgoRisk: FasgoRiskService,
  ) {}

  @Post()
  async createConsultation(@Body() body: any) {
    // Validar con Zod
    let input: CreateConsultationInput;
    try {
      input = CreateConsultationSchema.parse(body);
    } catch (error: any) {
      throw new BadRequestException(`Validación falló: ${error.message}`);
    }

    // Buscar embarazo (trae su ROB)
    const pregnancy = await this.prisma.pregnancy.findUnique({
      where: { id: input.pregnancy_id },
      include: { consultations: { orderBy: { created_at: 'desc' }, take: 1 } }, // Última consulta
    });

    if (!pregnancy) {
      throw new NotFoundException('Embarazo no encontrado');
    }

    // Validar campos obligatorios según matriz (ROB + EGA)
    const validationContext = {
      rob: pregnancy.rob_status,
      ega: input.gestational_weeks,
    };

    // Preparar body para validación
    const bodyForValidation = {
      gestational_weeks: input.gestational_weeks,
      weight_kg: input.vital_signs.weight_kg,
      blood_pressure_systolic: input.vital_signs.blood_pressure_systolic,
      blood_pressure_diastolic: input.vital_signs.blood_pressure_diastolic,
      fetal_heart_rate_bpm: input.vital_signs.fetal_heart_rate_bpm,
      proteinuria: input.vital_signs.proteinuria,
      symp_edema: input.symptoms.edema,
      symp_headache: input.symptoms.headache,
      symp_vision_changes: input.symptoms.vision_changes,
      uterine_height_cm: input.vital_signs.uterine_height_cm,
    };

    const validation = validateConsultationFields(bodyForValidation, validationContext);
    if (!validation.valid) {
      throw new BadRequestException(`Campos requeridos faltantes: ${validation.errors.join('; ')}`);
    }

    // Calcular ECA (la obstetra NO lo envía)
    const ecaResult = this.fasgoRisk.calculateECA(
      {
        weight_kg: input.vital_signs.weight_kg,
        blood_pressure_systolic: input.vital_signs.blood_pressure_systolic,
        blood_pressure_diastolic: input.vital_signs.blood_pressure_diastolic,
        fetal_heart_rate_bpm: input.vital_signs.fetal_heart_rate_bpm,
        proteinuria: input.vital_signs.proteinuria,
        symp_edema: input.symptoms.edema,
        symp_headache: input.symptoms.headache,
        symp_vision_changes: input.symptoms.vision_changes,
        symp_contractions: input.symptoms.contractions,
        symp_bleeding: input.symptoms.bleeding,
        symp_amniotic_fluid_loss: input.symptoms.amniotic_fluid_loss,
      },
      pregnancy.rob_status,
      pregnancy.consultations[0], // Consulta anterior si existe
    );

    // Guardar consulta + alertas en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          pregnancy_id: input.pregnancy_id,
          gestational_weeks: input.gestational_weeks,
          weight_kg: input.vital_signs.weight_kg,
          blood_pressure_systolic: input.vital_signs.blood_pressure_systolic,
          blood_pressure_diastolic: input.vital_signs.blood_pressure_diastolic,
          fetal_heart_rate_bpm: input.vital_signs.fetal_heart_rate_bpm,
          uterine_height_cm: input.vital_signs.uterine_height_cm,
          proteinuria: input.vital_signs.proteinuria,
          symp_edema: input.symptoms.edema,
          symp_headache: input.symptoms.headache,
          symp_vision_changes: input.symptoms.vision_changes,
          symp_contractions: input.symptoms.contractions,
          symp_bleeding: input.symptoms.bleeding,
          symp_amniotic_fluid_loss: input.symptoms.amniotic_fluid_loss,
          eca_calculated: ecaResult.eca,
          clinical_notes: input.clinical_notes,
          conduct_taken: input.conduct_taken,
          next_control_date: input.next_control_date ? new Date(input.next_control_date) : null,
        },
      });

      // Guardar alertas
      if (ecaResult.alerts.length > 0) {
        await tx.clinicalAlertLog.createMany({
          data: ecaResult.alerts.map((alert) => ({
            consultation_id: consultation.id,
            rule_id: alert.rule_id,
            message: alert.message,
            severity: alert.severity,
          })),
        });
      }

      return consultation;
    });

    return {
      success: true,
      data: {
        consultation_id: result.id,
        eca_calculated: result.eca_calculated,
        eca_calculated_at: result.eca_calculated_at,
        triggered_alerts: ecaResult.alerts,
        message: `Consulta guardada. ECA: ${result.eca_calculated}. ${ecaResult.alerts.length} alertas generadas.`,
      },
    };
  }
}
```

### Resultado esperado (Viernes)

- [ ] Postman: `POST http://localhost:3000/api/consultations`
- [ ] Request con PA=150/95
- [ ] Response (201):
  ```json
  {
    "success": true,
    "data": {
      "consultation_id": "uuid",
      "eca_calculated": "ALERT",
      "triggered_alerts": [{ "rule_id": "HTA_MODERADA", "message": "...", "severity": "MODERATE" }]
    }
  }
  ```
- [ ] Base de datos: consulta y alertas guardadas

---

## Jueves — Testing Integral

### Tareas

- [ ] **Probar Endpoint 1 nuevamente (crear paciente)**
- [ ] **Probar Endpoint 2 con distintos escenarios:**
  - [ ] PA normal → ECA=STABLE, sin alertas
  - [ ] PA=150/95 → ECA=ALERT, alerta HTA_MODERADA
  - [ ] PA=160/110 → ECA=CRITICAL, alerta PA_CRITICA_HARD
  - [ ] PA=140/90 + Proteinuria 2+ → ECA=CRITICAL, alerta PREECLAMPSIA_DIAGNOSTICO
- [ ] **Validar matriz condicional:**
  - [ ] ROB=BAJO, sin proteinuria → aceptado
  - [ ] ROB=MODERADO, sin proteinuria → rechazado
  - [ ] ROB=ALTO, sin FCF → rechazado
- [ ] **Chequear DB:** Consultas y alertas guardadas correctamente

### Postman Collection (para copiar)

```json
{
  "info": {
    "name": "Gia MVP Testing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Create Pregnancy (ROB=ALTO)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/pregnancies",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer dev-obstetra-123",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"patient\":{\"first_name\":\"Romina\",\"last_name\":\"Lencinas\",\"national_id\":\"959595955\",\"birth_date\":\"1983-08-27T00:00:00Z\",\"phone\":\"+5491123456789\",\"health_ins\":\"OSDE\",\"blood_type\":\"A+\"},\"pregnancy\":{\"fum\":\"2026-02-10T00:00:00Z\",\"fpp\":\"2026-11-17T00:00:00Z\",\"formula_g\":3,\"formula_p\":2,\"formula_a\":0,\"formula_c\":1},\"antecedents\":{\"hta_cronica\":true,\"diabetes_previa\":false,\"preeclampsia_previa\":false,\"imc_inicial\":31.2,\"edad_al_embarazo\":42,\"lupus\":false,\"trombofilia\":false}}"
        }
      }
    },
    {
      "name": "2. Create Consultation (PA=140/90, ECA=ALERT)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/consultations",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer dev-obstetra-123",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"pregnancy_id\":\"COPIAR_ID_DEL_PASO_1\",\"gestational_weeks\":28,\"vital_signs\":{\"weight_kg\":72.5,\"blood_pressure_systolic\":140,\"blood_pressure_diastolic\":90,\"fetal_heart_rate_bpm\":145,\"uterine_height_cm\":27,\"proteinuria\":\"Trazas\"},\"symptoms\":{\"edema\":true,\"headache\":false,\"vision_changes\":false,\"contractions\":false,\"bleeding\":false,\"amniotic_fluid_loss\":false},\"clinical_notes\":\"Edema leve.\",\"conduct_taken\":\"solicita_estudios\"}"
        }
      }
    }
  ]
}
```

### Resultado esperado (Jueves)

- [ ] Todos los tests pasan sin errores
- [ ] Consola limpia (sin warnings)
- [ ] DB intacta y consistente

---

## Viernes — Demo y Handoff

### Tareas

- [ ] **Ejecutar los 5 test Postman nuevamente** (Esto es el "demo" con el PO)
- [ ] **Documentar cualquier deviation del contrato API**
- [ ] **Crear README.md del proyecto:**
  ```bash
  mkdir gia-api
  touch gia-api/README.md
  ```

### README.md (Copiar y pegar)

```markdown
# Gia API — MVP Semanas 3-4

## Setup

```bash
docker-compose up -d
npm install
npx prisma db push
npm run start:dev
```

## Testing

1. Abre Postman
2. Importa `Gia_MVP_Postman.json`
3. Ejecuta las colecciones en orden

## Endpoints

- `POST /api/pregnancies` — Crear paciente + embarazo (calcula ROB)
- `POST /api/consultations` — Cargar consulta (calcula ECA + alertas)

## Arquitectura

- Backend: NestJS
- DB: PostgreSQL 16
- Validación: Zod
- Servicios clínicos: RobCalculationService, FasgoRiskService

## Próximo paso

Semana 5: Frontend conecta a estos endpoints (reemplaza `window.giaPatients.push()`).
```

### Resultado esperado (Viernes)

- [ ] Dev muestra al PO la URL `http://localhost:3000/api/consultations`
- [ ] PO ejecuta Postman, ve respuestas 201 con alertas
- [ ] PO confirma: "Listo para que el frontend se conecte"
- [ ] Dev entrega el código en GitHub (rama `dev`) con:
  - [ ] Prisma schema
  - [ ] DTOs Zod
  - [ ] RobCalculationService completo
  - [ ] FasgoRiskService completo
  - [ ] Dos controladores con endpoints testados
  - [ ] README.md
  - [ ] `.env.local` (sin secretos)
  - [ ] `docker-compose.yml`
  - [ ] Postman collection JSON

---

# RESUMEN FINAL — Qué Entregar al PO Viernes Semana 4

| Entregable | Dónde | Estado |
|---|---|---|
| API en localhost:3000 | Docker | ✅ Funcionando |
| 2 Endpoints POST | NestJS | ✅ Testeados |
| Base de datos | PostgreSQL | ✅ 4 tablas, relaciones intactas |
| Validación Zod | DTO | ✅ Rechaza inválidos |
| ROB calculado e inmutable | DB | ✅ Guardado en `pregnancies` |
| ECA calculado cada consulta | DB | ✅ Guardado en `consultations` |
| Alertas guardadas | `clinical_alerts_log` | ✅ Completas |
| Tests manuales pasados | Postman | ✅ 5/5 |
| Código limpio | GitHub | ✅ SIN hardcodes |
| README | gia-api/README.md | ✅ Instructivo |

---

**Viernes Semana 4, 17:00 hs:**

Dev cierra la laptop y dice: *"Están listos los dos endpoints. La obstetra puede empezar a conectar el frontend en Semana 5."*

PO ve la respuesta de Postman con alertas generadas automáticamente y confirma:

*"Perfecto. El backend es fuente de verdad clínica. El frontend no calcula nada. Vamos a la Semana 5."*

---

FIN DEL CHECKLIST.

Sin ambigüedades. Línea recta a Semana 7-8.
