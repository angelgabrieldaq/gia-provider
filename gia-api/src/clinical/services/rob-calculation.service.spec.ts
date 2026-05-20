import { RobCalculationService } from './rob-calculation.service';

describe('RobCalculationService', () => {
  let service: RobCalculationService;

  beforeEach(() => {
    service = new RobCalculationService();
  });

  // ── Test 1: Sin factores de riesgo ────────────────────────────────────────
  it('should return BAJO when no risk factors', () => {
    const result = service.calculate({}, 30);
    expect(result.rob_status).toBe('BAJO');
    expect(result.justification).toEqual(['Sin factores de riesgo identificados']);
  });

  // ── Test 2: Edad ≥ 35 (FASGO 2025) ──────────────────────────────────────
  it('should return MODERADO when age >= 35', () => {
    const result = service.calculate({}, 35);
    expect(result.rob_status).toBe('MODERADO');
    expect(result.justification).toContain('Edad de riesgo (35 años)');
  });

  // ── Test 3: Edad exactamente 34 (por debajo del umbral) ──────────────────
  it('should return BAJO when age is 34 (below threshold)', () => {
    const result = service.calculate({}, 34);
    expect(result.rob_status).toBe('BAJO');
    expect(result.justification).toEqual(['Sin factores de riesgo identificados']);
  });

  // ── Test 4: HTA crónica sola (BAJO → MODERADO) ───────────────────────────
  it('should return MODERADO when hta_cronica (escalón desde BAJO)', () => {
    const result = service.calculate({ hta_cronica: true }, 30);
    expect(result.rob_status).toBe('MODERADO');
    expect(result.justification).toContain('Hipertensión crónica');
  });

  // ── Test 5: Diabetes previa → ALTO directo ───────────────────────────────
  it('should return ALTO when diabetes_previa', () => {
    const result = service.calculate({ diabetes_previa: true }, 28);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Diabetes previa');
  });

  // ── Test 6: Preeclampsia previa → ALTO directo ───────────────────────────
  it('should return ALTO when preeclampsia_previa', () => {
    const result = service.calculate({ preeclampsia_previa: true }, 32);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Antecedente de preeclampsia');
  });

  // ── Test 7: Obesidad IMC > 30 (BAJO → MODERADO) ─────────────────────────
  it('should return MODERADO when obesity (imc_inicial > 30)', () => {
    const result = service.calculate({ imc_inicial: 31 }, 28);
    expect(result.rob_status).toBe('MODERADO');
    expect(result.justification[0]).toMatch(/Obesidad/);
  });

  // ── Test 8: Lupus → ALTO directo ─────────────────────────────────────────
  it('should return ALTO when lupus', () => {
    const result = service.calculate({ lupus: true }, 25);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Enfermedad autoinmune / Trombofilia');
  });

  // ── Test 9: Trombofilia → ALTO directo ───────────────────────────────────
  it('should return ALTO when trombofilia', () => {
    const result = service.calculate({ trombofilia: true }, 25);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Enfermedad autoinmune / Trombofilia');
  });

  // ── Test 10: edad >= 35 + HTA crónica → ALTO (dos escalones) ─────────────
  it('should return ALTO when age >= 35 AND hta_cronica (two-step escalation)', () => {
    // edad: BAJO→MODERADO, luego HTA: MODERADO→ALTO
    const result = service.calculate({ hta_cronica: true }, 38);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Edad de riesgo (38 años)');
    expect(result.justification).toContain('Hipertensión crónica');
    expect(result.justification.length).toBe(2);
  });

  // ── Test 11: Múltiples factores ───────────────────────────────────────────
  it('should return ALTO with multiple risk factors', () => {
    const result = service.calculate(
      {
        hta_cronica: true,
        diabetes_previa: true,
        imc_inicial: 35,
        preeclampsia_previa: true,
      },
      44,
    );
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification.length).toBeGreaterThanOrEqual(4);
  });

  // ── Test 12: IMC exactamente 30 (en umbral, NO debe subir) ───────────────
  it('should return BAJO when imc_inicial is exactly 30 (not above threshold)', () => {
    const result = service.calculate({ imc_inicial: 30 }, 28);
    expect(result.rob_status).toBe('BAJO');
  });

  // ── Test 13: Obesidad (MODERADO→ALTO por edad + IMC) ─────────────────────
  it('should return ALTO when age >= 35 AND obesity (two-step escalation)', () => {
    const result = service.calculate({ imc_inicial: 32 }, 36);
    expect(result.rob_status).toBe('ALTO');
    expect(result.justification).toContain('Edad de riesgo (36 años)');
    expect(result.justification[1]).toMatch(/Obesidad/);
  });
});
