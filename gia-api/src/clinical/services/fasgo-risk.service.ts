import { Injectable, BadRequestException } from '@nestjs/common';
import { FieldValidationMatrix } from '../matrix/field-validation-matrix';
import { ConsultationInput, EcaResult, TriggeredAlert } from '../dto/fasgo-risk.dto';

@Injectable()
export class FasgoRiskService {
  /**
   * Calcula el Estado Clínico Actual (ECA) basado en signos vitales,
   * síntomas y contexto clínico.
   *
   * REGLAS CLÍNICAS (FASGO 2025):
   *
   * CRITICAL: PA >= 160/110 | PA >= 140/90 + Proteinuria 2+/3+ | Sangrado > 20sem
   * ALERT:    PA >= 140/90 (sin proteinuria severa) | FCF < 110 o > 160 | FCF = 0
   * WATCHFUL: Edema | Cefalea | Cambios visuales
   * STABLE:   Todos los signos normales
   */
  calculate(input: ConsultationInput): EcaResult {
    // PASO 1: Validar campos requeridos según ROB y EGA
    const validation = FieldValidationMatrix.validate(
      {
        weight_kg: input.vital_signs.weight_kg,
        blood_pressure_systolic: input.vital_signs.blood_pressure_systolic,
        blood_pressure_diastolic: input.vital_signs.blood_pressure_diastolic,
        fetal_heart_rate_bpm: input.vital_signs.fetal_heart_rate_bpm,
        uterine_height_cm: input.vital_signs.uterine_height_cm,
        proteinuria: input.proteinuria,
        symptoms: input.symptoms,
      },
      input.rob_status,
      input.gestational_weeks,
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Campos obligatorios faltantes según el contexto clínico',
        missing_fields: validation.missing_fields,
      });
    }

    // PASO 2: Inicializar estado y alertas
    let eca: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL' = 'STABLE';
    const alerts: TriggeredAlert[] = [];

    const sys = input.vital_signs.blood_pressure_systolic;
    const dias = input.vital_signs.blood_pressure_diastolic;
    const fcf = input.vital_signs.fetal_heart_rate_bpm || 0;
    const proteinuria = input.proteinuria || 'Negativa';
    const bleeding = input.symptoms?.bleeding || false;
    const edema = input.symptoms?.edema || false;
    const headache = input.symptoms?.headache || false;
    const vision = input.symptoms?.vision_changes || false;

    // ═══ CRITICAL ═══
    // Regla 1: PA Crisis (>= 160/110)
    if (sys >= 160 || dias >= 110) {
      eca = 'CRITICAL';
      alerts.push({
        rule_id: 'HTA_CRITICA',
        message: 'Crisis Hipertensiva: PA sistólica >= 160 O diastólica >= 110',
        severity: 'HARD',
      });
    }

    // Regla 2: Preeclampsia Severa (PA >= 140/90 + Proteinuria 2+/3+)
    if ((sys >= 140 || dias >= 90) && (proteinuria === '2+' || proteinuria === '3+')) {
      eca = 'CRITICAL';
      alerts.push({
        rule_id: 'PREECLAMPSIA',
        message: 'Sospecha de Preeclampsia Severa: PA elevada + Proteinuria >= 2+',
        severity: 'HARD',
      });
    }

    // Regla 3: Sangrado en 3er trimestre (bleeding=true AND EGA > 20)
    if (bleeding && input.gestational_weeks > 20) {
      eca = 'CRITICAL';
      alerts.push({
        rule_id: 'BLEEDING_LATE',
        message: 'Sospecha de Hemorragia del Tercer Trimestre',
        severity: 'HARD',
      });
    }

    // ═══ ALERT (solo si no es CRITICAL) ═══
    if (eca !== 'CRITICAL') {
      // Regla 4: PA moderada (>= 140/90, sin proteinuria severa)
      if ((sys >= 140 || dias >= 90) && !(proteinuria === '2+' || proteinuria === '3+')) {
        eca = 'ALERT';
        alerts.push({
          rule_id: 'HTA_MODERADA',
          message: 'Hipertensión Leve/Moderada: PA >= 140/90',
          severity: 'MODERATE',
        });
      }

      if (input.gestational_weeks > 12) {
        // Regla 5: FCF anormal (< 110 O > 160)
        if (fcf > 0 && (fcf < 110 || fcf > 160)) {
          eca = 'ALERT';
          alerts.push({
            rule_id: 'FCF_ANORMAL',
            message: `FCF anormal: ${fcf} lpm (rango normal 110-160)`,
            severity: 'MODERATE',
          });
        }

        // Regla 6: FCF ausente (= 0)
        if (fcf === 0) {
          eca = 'CRITICAL';
          alerts.push({
            rule_id: 'FCF_AUSENTE',
            message: 'CRÍTICO: Ausencia de latido fetal',
            severity: 'HARD',
          });
        }
      }
    }

    // ═══ WATCHFUL (solo si sigue STABLE) ═══
    if (eca === 'STABLE') {
      // Regla 7: Edema presente
      if (edema) {
        eca = 'WATCHFUL';
        alerts.push({
          rule_id: 'EDEMA_VIGILAR',
          message: 'Presencia de edemas. Vigilar PA en próxima consulta',
          severity: 'INFORMATIVE',
        });
      }

      // Regla 8: Cefalea presente
      if (headache) {
        eca = 'WATCHFUL';
        alerts.push({
          rule_id: 'HEADACHE_VIGILAR',
          message: 'Cefalea reportada. Descartar síntomas de preeclampsia',
          severity: 'INFORMATIVE',
        });
      }

      // Regla 9: Cambios visuales
      if (vision) {
        eca = 'WATCHFUL';
        alerts.push({
          rule_id: 'VISION_CHANGE',
          message: 'Cambios visuales reportados. Evaluar contexto de preeclampsia',
          severity: 'INFORMATIVE',
        });
      }
    }

    return {
      eca_calculated: eca,
      triggered_alerts: alerts,
    };
  }
}
