import { FieldValidationMatrix } from './field-validation-matrix';

describe('FieldValidationMatrix', () => {

  // TEST 1: Vitales obligatorios SIEMPRE
  it('should fail if weight_kg is missing (ROB BAJO, week 10)', () => {
    const result = FieldValidationMatrix.validate(
      {
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        // weight_kg: MISSING
      },
      'BAJO',
      10,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('weight_kg'))).toBe(true);
  });

  // TEST 2: PA obligatoria siempre
  it('should fail if blood_pressure missing (ROB BAJO, week 10)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        // blood_pressure_diastolic: MISSING
      },
      'BAJO',
      10,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('blood_pressure_diastolic'))).toBe(true);
  });

  // TEST 3: Proteinuria obligatoria si ROB MODERADO
  it('should fail if proteinuria missing (ROB MODERADO, week 20)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        // proteinuria: MISSING
      },
      'MODERADO',
      20,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('proteinuria'))).toBe(true);
  });

  // TEST 4: Edema obligatorio si ROB ALTO
  it('should fail if edema missing (ROB ALTO, week 30)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        proteinuria: 'Negativa',
        symptoms: {
          headache: false,
          // edema: MISSING
        },
      },
      'ALTO',
      30,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('edema'))).toBe(true);
  });

  // TEST 5: FCF obligatoria si semana > 12
  it('should fail if FCF missing (week 24, ROB BAJO)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        uterine_height_cm: 24,
        // fetal_heart_rate_bpm: MISSING
      },
      'BAJO',
      24,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('fetal_heart_rate_bpm'))).toBe(true);
  });

  // TEST 6: Altura uterina obligatoria si semana > 20
  it('should fail if uterine_height missing (week 32, ROB BAJO)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        fetal_heart_rate_bpm: 150,
        // uterine_height_cm: MISSING
      },
      'BAJO',
      32,
    );
    expect(result.valid).toBe(false);
    expect(result.missing_fields.some(f => f.includes('uterine_height_cm'))).toBe(true);
  });

  // TEST 7: Pasa con datos mínimos (ROB BAJO, semana temprana)
  it('should pass with only vitals (ROB BAJO, week 8)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 65,
        blood_pressure_systolic: 118,
        blood_pressure_diastolic: 76,
      },
      'BAJO',
      8,
    );
    expect(result.valid).toBe(true);
    expect(result.missing_fields.length).toBe(0);
  });

  // TEST 8: Pasa con datos completos (ROB ALTO, semana avanzada)
  it('should pass with complete data (ROB ALTO, week 36)', () => {
    const result = FieldValidationMatrix.validate(
      {
        weight_kg: 78,
        blood_pressure_systolic: 135,
        blood_pressure_diastolic: 88,
        proteinuria: '1+',
        symptoms: {
          edema: true,
          headache: false,
          vision_changes: false,
          contractions: false,
          bleeding: false,
          amniotic_fluid_loss: false,
        },
        fetal_heart_rate_bpm: 155,
        uterine_height_cm: 35,
      },
      'ALTO',
      36,
    );
    expect(result.valid).toBe(true);
    expect(result.missing_fields.length).toBe(0);
  });
});
