# ADR 001: ROB (Riesgo Obstétrico Basal) Inmutable en MVP

**Status:** ACCEPTED  
**Date:** Mayo 2026  
**Deciders:** Product Owner (clínico), Desarrollador Full Stack Senior  
**Affects:** Modelo de datos, validación clínica, auditoría ISO 14971  

---

## Contexto y Problema

En un SaMD obstétrico, el Riesgo Obstétrico Basal (ROB) es la clasificación persistente que determina:
- Qué campos de datos son obligatorios en cada consulta
- Con qué frecuencia se necesitan controles
- Qué umbrales disparan alertas

**La pregunta clínica original:** ¿Debe el ROB poder actualizarse dinámicamente si la obstetra descubre un nuevo antecedente (ej: "me olvidé decirle que tengo diabetes")?

**El dilema técnico:** 
- ✅ Dinámico = Más flexible, refleja la realidad clínica, pero requiere Event Sourcing + versionado histórico (complejidad arquitectónica, 3-4 días extra de dev)
- ✅ Inmutable = Simple, auditoria clara, pero menos flexible si aparecen nuevos antecedentes

---

## Decisión

**El ROB será INMUTABLE en el MVP.**

Una vez asignado al crear el embarazo, no puede cambiarse vía UI. Si la obstetra descubre un nuevo antecedente después de la Semana 1, lo registra en `clinical_notes` de la consulta correspondiente, pero el ROB del embarazo permanece igual hasta una futura versión con versionado histórico.

---

## Justificación Clínica

1. **Integridad histórica:** Si el ROB pudiera cambiar retroactivamente, sería imposible auditar por qué se tomó una decisión clínica en un momento específico. Ejemplo: "En la Semana 4, la obstetra decidió no derivar porque el ROB era BAJO. Después, en la Semana 6, cambia a ALTO. ¿Fue la decisión de la Semana 4 correcta?" Sin versionado, no se sabe.

2. **Cumplimiento ISO 14971:** La norma exige trazabilidad de toda decisión clínica. Un ROB que cambia sin registro histórico viola este requisito.

3. **Aceptabilidad clínica validada:** La obstetra confirmó que puede trabajar con ROB inmutable en el MVP (mensaje WhatsApp, Mayo 2026).

---

## Justificación Técnica

1. **Reduces scope de MVP:** Sin Event Sourcing, el modelo de datos es simple (Prisma + PostgreSQL estándar). Sin versionado, no necesitas tabla de historiales paralela.

2. **Velocidad de entrega:** 3-4 días ahorrados es diferencia entre entregar en Semana 4 vs. Semana 5 para la obstetra.

3. **Path to v1.1 claro:** La decisión no cierra la puerta a Dynamic ROB en v1.1 con Event Sourcing. Es una mejora incremental, no un rediseño.

---

## Riesgos Aceptados (Known Limitations)

| Riesgo | Mitigación | Responsable |
|--------|-----------|------------|
| **Cambio de antecedente no reflejado en ROB** | Documento claro en COM: obstetra debe registrar nuevo antecedente en notas de la consulta. Sistema no lo refleja en campos obligatorios automáticamente. | Obstetra entiende la limitación |
| **Auditor pregunta por qué cambió ROB** | Respuesta: "MVP 1.0 no soporta versionado dinámico. Está en roadmap v1.1 con justificación histórica." ADR disponible. | Documentación clara en ADR |
| **Frecuencia de controles no se ajusta automáticamente** | Si aparece diabetes en Semana 4, la frecuencia sugerida sigue siendo la de BAJO. Obstetra la ajusta manualmente si lo considera necesario. | Responsabilidad clínica de la obstetra |

---

## Alternativas Consideradas y Rechazadas

### Alternativa A: Dynamic ROB con Event Sourcing (Rechazada)
```
Ventajas: Refleja cambios clínicos reales, auditoría perfecta
Desventajas: +3-4 días de dev, +2 tablas en BD (RobVersions, AuditLog)
             Retrasa entrega a obstetra a Semana 5
Decisión: NO — MVP no espera más. Versión 1.1.
```

### Alternativa B: ROB Editable con Justificación Manual (Rechazada)
```
Ventajas: Permite correcciones rápidas, sigue siendo auditado
Desventajas: Requiere UI adicional, validación compleja, requiere permisos/roles
             Introduce riesgo de manipulación accidental
Decisión: NO — Aumenta scope, riesgo de auditoría. Inmutable es más seguro.
```

### Alternativa C: ROB Inmutable (SELECCIONADA)
```
Ventajas: Simple, auditado, rápido, reducido scope
Desventajas: Menos flexible, requiere disciplina de documentación en notas
Decisión: SÍ — Aceptable para MVP si obstetra lo acepta (confirmado)
```

---

## Consecuencias

### Para el Código
- Prisma schema: `rob_status` y `rob_justification` en tabla `Pregnancy` son de lectura después del INSERT
- Base de datos: No hay campo de "fecha_cambio_rob" porque no cambia
- Backend: `RobCalculationService.calculate()` solo se invoca UNA VEZ en `POST /api/pregnancies`

### Para la Obstetra
- Si descubre HTA en Semana 4 que no estaba en Semana 1: Registra en notas, no cambia el ROB
- Puede aumentar frecuencia de controles manualmente (el campo `next_control_date` es editable por ella)

### Para el Producto
- MVP scope confirmado: No requiere Event Sourcing
- Roadmap v1.1: Incluir Dynamic ROB con versionado histórico
- Comunicación clara: "MVP 1.0 tiene ROB estático por simplicidad. v1.1 agrega histórico de cambios."

---

## Implementación

### Sprint 1, Semanas 3-4
- `RobCalculationService.calculate()` se ejecuta en `POST /api/pregnancies` SOLAMENTE
- Resultado se guarda en `pregnancies.rob_status` como `@updatedAt` sin triggers
- No hay endpoint para editar ROB

### Sprint 2, v1.1 (No planificado en este ADR)
- Crear tabla `PregnancyRobHistory(id, pregnancy_id, rob_status, reason, changed_at, changed_by)`
- Endpoint `PATCH /api/pregnancies/{id}/update-rob` con justificación obligatoria
- Reevaluar campos obligatorios por cada versión del ROB

---

## Validación Clínica

**Pregunta hecha a la obstetra (Mayo 2026):**

> "En el MVP, el ROB se calcula una sola vez cuando creo la paciente. Si descubrís un nuevo antecedente después, el sistema sigue usando el ROB original. ¿Puedes trabajar con eso en Semana 7-8, o es inaceptable?"

**Respuesta:** "Sí" (confirmado médico clínico del equipo)

---

## Tracking

| Aspecto | Estado | Evidencia |
|--------|--------|-----------|
| Aceptación clínica | ✅ Confirmada | Confirmación de obstetra, Mayo 2026 |
| Diseño BD | ✅ Implementado | Prisma schema `pregnancies` |
| Código backend | ✅ En dev | `RobCalculationService.calculate()` |
| Documentación COM | ✅ Actualizada | COM sección 1.1 + Known Limitation |
| Testing | ⏳ En Semana 4 | Checklist dev |

---

## Referencias

- **COM:** Sección 1.1 "Riesgo Obstétrico Basal (ROB)"
- **API Contract:** `POST /api/pregnancies` — `RobCalculationService`
- **Backend Checklist:** Semana 3, Miércoles — Crear RobCalculationService
- **ISO 14971:** Gestión de riesgo — Trazabilidad de decisiones clínicas

---

**Aprobado por:** Product Owner (clínico) + Desarrollador Full Stack Senior  
**Fecha de efectividad:** Lunes, Semana 3 (inicio de implementación)
