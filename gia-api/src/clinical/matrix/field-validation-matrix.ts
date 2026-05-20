export interface ValidationResult {
  valid: boolean;
  missing_fields: string[];
}

export interface ValidationInput {
  weight_kg?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  fetal_heart_rate_bpm?: number;
  uterine_height_cm?: number;
  proteinuria?: string; // 'Negativa' | 'Trazas' | '1+' | '2+' | '3+'
  symptoms?: {
    edema?: boolean;
    headache?: boolean;
    vision_changes?: boolean;
    contractions?: boolean;
    bleeding?: boolean;
    amniotic_fluid_loss?: boolean;
  };
}

export class FieldValidationMatrix {
  /**
   * Valida que los campos presentes en el input cumplen con los requisitos
   * según el ROB (Riesgo Obstétrico Basal) y la edad gestacional.
   *
   * Reglas clínicas (FASGO 2025 / COM 2.0):
   *
   * 1. Vitales SIEMPRE obligatorios:
   *    - weight_kg
   *    - blood_pressure_systolic
   *    - blood_pressure_diastolic
   *
   * 2. Proteinuria:
   *    - Obligatoria si ROB = 'MODERADO' o 'ALTO'
   *    - Opcional si ROB = 'BAJO'
   *
   * 3. Edema:
   *    - Obligatoria si ROB = 'ALTO'
   *    - Opcional si ROB < 'ALTO'
   *
   * 4. Síntomas de alarma (cualquiera):
   *    - Obligatorio evaluar si ROB = 'MODERADO' o 'ALTO'
   *    - Opcional si ROB = 'BAJO'
   *
   * 5. FCF (Frecuencia Cardíaca Fetal):
   *    - Obligatoria si gestational_weeks > 12 O si ROB = 'ALTO'
   *    - Opcional si gestational_weeks <= 12 Y ROB != 'ALTO'
   *
   * 6. Altura Uterina:
   *    - Obligatoria si gestational_weeks > 20
   *    - Opcional si gestational_weeks <= 20
   */
  static validate(
    input: ValidationInput,
    rob_status: 'BAJO' | 'MODERADO' | 'ALTO',
    gestational_weeks: number,
  ): ValidationResult {
    const missing_fields: string[] = [];

    // RULE 1: Vitales siempre obligatorios
    if (input.weight_kg === undefined || input.weight_kg === null) {
      missing_fields.push('weight_kg (obligatorio siempre)');
    }
    if (input.blood_pressure_systolic === undefined || input.blood_pressure_systolic === null) {
      missing_fields.push('blood_pressure_systolic (obligatorio siempre)');
    }
    if (input.blood_pressure_diastolic === undefined || input.blood_pressure_diastolic === null) {
      missing_fields.push('blood_pressure_diastolic (obligatorio siempre)');
    }

    // RULE 2: Proteinuria obligatoria si ROB >= MODERADO
    if (
      (rob_status === 'MODERADO' || rob_status === 'ALTO') &&
      (input.proteinuria === undefined || input.proteinuria === null || input.proteinuria === '')
    ) {
      missing_fields.push(`proteinuria (obligatoria en ROB ${rob_status})`);
    }

    // RULE 3: Edema obligatorio si ROB = ALTO
    if (
      rob_status === 'ALTO' &&
      (input.symptoms?.edema === undefined || input.symptoms?.edema === null)
    ) {
      missing_fields.push('symptoms.edema (obligatorio en ROB ALTO)');
    }

    // RULE 4: Síntomas de alarma obligatorio verificar si ROB >= MODERADO
    if ((rob_status === 'MODERADO' || rob_status === 'ALTO') && !input.symptoms) {
      missing_fields.push(`symptoms (obligatorio evaluar en ROB ${rob_status})`);
    }

    // RULE 5: FCF obligatoria si EGA > 12 semanas O ROB = ALTO
    if (
      (gestational_weeks > 12 || rob_status === 'ALTO') &&
      (input.fetal_heart_rate_bpm === undefined || input.fetal_heart_rate_bpm === null)
    ) {
      missing_fields.push(
        `fetal_heart_rate_bpm (obligatoria en semana ${gestational_weeks} o ROB ${rob_status})`,
      );
    }

    // RULE 6: Altura uterina obligatoria si EGA > 20 semanas
    if (
      gestational_weeks > 20 &&
      (input.uterine_height_cm === undefined || input.uterine_height_cm === null)
    ) {
      missing_fields.push(`uterine_height_cm (obligatoria en semana ${gestational_weeks})`);
    }

    return {
      valid: missing_fields.length === 0,
      missing_fields,
    };
  }
}
