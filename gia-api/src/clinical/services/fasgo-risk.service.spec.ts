import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FasgoRiskService } from './fasgo-risk.service';
import { ConsultationInput } from '../dto/fasgo-risk.dto';

describe('FasgoRiskService', () => {
  let service: FasgoRiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FasgoRiskService],
    }).compile();

    service = module.get<FasgoRiskService>(FasgoRiskService);
  });

  // TEST 1: Rechaza si falta PA
  it('should throw BadRequestException if PA missing', () => {
    const input: any = {
      rob_status: 'BAJO',
      gestational_weeks: 20,
      vital_signs: {
        weight_kg: 70,
        blood_pressure_systolic: undefined, // MISSING
        blood_pressure_diastolic: 80,
      },
    };

    expect(() => service.calculate(input)).toThrow(BadRequestException);
  });

  // TEST 2: Retorna STABLE cuando vitales son normales
  it('should return STABLE when vital signs are normal', () => {
    const input: ConsultationInput = {
      rob_status: 'BAJO',
      gestational_weeks: 20,
      vital_signs: {
        weight_kg: 70,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        fetal_heart_rate_bpm: 140,
        uterine_height_cm: 20,
      },
      proteinuria: 'Negativa',
      symptoms: {},
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('STABLE');
    expect(result.triggered_alerts.length).toBe(0);
  });

  // TEST 3: Retorna ALERT cuando PA = 145/95
  it('should return ALERT when PA is 145/95', () => {
    const input: ConsultationInput = {
      rob_status: 'MODERADO',
      gestational_weeks: 28,
      vital_signs: {
        weight_kg: 72,
        blood_pressure_systolic: 145,
        blood_pressure_diastolic: 95,
        fetal_heart_rate_bpm: 145,
        uterine_height_cm: 28,
      },
      proteinuria: 'Trazas',
      symptoms: { edema: false },
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('ALERT');
    expect(result.triggered_alerts.some(a => a.rule_id === 'HTA_MODERADA')).toBe(true);
  });

  // TEST 4: Retorna CRITICAL cuando PA = 165/110
  it('should return CRITICAL when PA is 165/110', () => {
    const input: ConsultationInput = {
      rob_status: 'ALTO',
      gestational_weeks: 32,
      vital_signs: {
        weight_kg: 75,
        blood_pressure_systolic: 165,
        blood_pressure_diastolic: 110,
        fetal_heart_rate_bpm: 150,
        uterine_height_cm: 32,
      },
      proteinuria: '1+',
      symptoms: { edema: false }, // ROB ALTO: edema debe ser explícito
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('CRITICAL');
    expect(result.triggered_alerts.some(a => a.rule_id === 'HTA_CRITICA')).toBe(true);
  });

  // TEST 5: Retorna CRITICAL cuando hay sangrado a semana 30
  it('should return CRITICAL when bleeding at week 30', () => {
    const input: ConsultationInput = {
      rob_status: 'MODERADO',
      gestational_weeks: 30,
      vital_signs: {
        weight_kg: 74,
        blood_pressure_systolic: 125,
        blood_pressure_diastolic: 85,
        fetal_heart_rate_bpm: 145,
        uterine_height_cm: 30,
      },
      proteinuria: 'Negativa',
      symptoms: { bleeding: true },
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('CRITICAL');
    expect(result.triggered_alerts.some(a => a.rule_id === 'BLEEDING_LATE')).toBe(true);
  });

  // TEST 6: Retorna WATCHFUL cuando hay edema
  it('should return WATCHFUL when edema present', () => {
    const input: ConsultationInput = {
      rob_status: 'BAJO',
      gestational_weeks: 24,
      vital_signs: {
        weight_kg: 71,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        fetal_heart_rate_bpm: 140,
        uterine_height_cm: 24,
      },
      proteinuria: 'Negativa',
      symptoms: { edema: true, headache: false },
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('WATCHFUL');
    expect(result.triggered_alerts.some(a => a.rule_id === 'EDEMA_VIGILAR')).toBe(true);
  });

  // TEST 7: Retorna CRITICAL cuando FCF = 0 (ausencia)
  it('should return CRITICAL when FCF is 0 (absent)', () => {
    const input: ConsultationInput = {
      rob_status: 'ALTO',
      gestational_weeks: 28,
      vital_signs: {
        weight_kg: 73,
        blood_pressure_systolic: 130,
        blood_pressure_diastolic: 85,
        fetal_heart_rate_bpm: 0, // AUSENTE
        uterine_height_cm: 28,
      },
      proteinuria: '1+',
      symptoms: { edema: false }, // ROB ALTO: edema debe ser explícito
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('CRITICAL');
    expect(result.triggered_alerts.some(a => a.rule_id === 'FCF_AUSENTE')).toBe(true);
  });

  // TEST 8: Retorna CRITICAL cuando PA >= 140/90 + Proteinuria 2+
  it('should return CRITICAL when PA >= 140/90 AND Proteinuria 2+', () => {
    const input: ConsultationInput = {
      rob_status: 'ALTO',
      gestational_weeks: 34,
      vital_signs: {
        weight_kg: 76,
        blood_pressure_systolic: 142,
        blood_pressure_diastolic: 92,
        fetal_heart_rate_bpm: 148,
        uterine_height_cm: 34,
      },
      proteinuria: '2+', // SEVERA
      symptoms: { edema: false }, // ROB ALTO: edema debe ser explícito
    };

    const result = service.calculate(input);

    expect(result.eca_calculated).toBe('CRITICAL');
    expect(result.triggered_alerts.some(a => a.rule_id === 'PREECLAMPSIA')).toBe(true);
  });
});
