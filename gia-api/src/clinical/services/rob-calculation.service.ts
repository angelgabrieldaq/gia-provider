import { Injectable } from '@nestjs/common';
import { AntecedentsInput, RobResult } from '../dto/rob-calculation.dto';

@Injectable()
export class RobCalculationService {
  calculate(antecedents: AntecedentsInput, ageAtPregnancy: number): RobResult {
    const justification: string[] = [];
    let robLevel: 'BAJO' | 'MODERADO' | 'ALTO' = 'BAJO';

    // Edad de riesgo — umbral FASGO 2025 / ACOG: ≥35 años
    if (ageAtPregnancy >= 35) {
      justification.push(`Edad de riesgo (${ageAtPregnancy} años)`);
      robLevel = 'MODERADO';
    }

    // HTA crónica — sube un escalón (BAJO→MODERADO, MODERADO→ALTO)
    if (antecedents.hta_cronica) {
      justification.push('Hipertensión crónica');
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

    // Obesidad (IMC > 30) — sube un escalón (BAJO→MODERADO, MODERADO→ALTO)
    if ((antecedents.imc_inicial ?? 0) > 30) {
      justification.push(`Obesidad (IMC ${antecedents.imc_inicial})`);
      robLevel = robLevel === 'BAJO' ? 'MODERADO' : 'ALTO';
    }

    // Lupus / Trombofilia — directo a ALTO
    if (antecedents.lupus || antecedents.trombofilia) {
      justification.push('Enfermedad autoinmune / Trombofilia');
      robLevel = 'ALTO';
    }

    if (justification.length === 0) {
      justification.push('Sin factores de riesgo identificados');
    }

    return { rob_status: robLevel, justification };
  }
}
