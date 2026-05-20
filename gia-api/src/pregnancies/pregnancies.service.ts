import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RobCalculationService } from '../clinical/services/rob-calculation.service';
import { CreatePregnancyInput } from './dto/create-pregnancy.dto';

@Injectable()
export class PregnanciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly robCalc: RobCalculationService,
  ) {}

  async createPregnancy(input: CreatePregnancyInput) {
    // 1. Verificar si la paciente ya existe por DNI
    const existing = await this.prisma.patient.findUnique({
      where: { national_id: input.patient.national_id },
    });

    if (existing) {
      throw new ConflictException(
        'DNI ya existe en el sistema. Si es la misma paciente, cree un nuevo embarazo usando POST /api/pregnancies/{patient_id}/new-pregnancy',
      );
    }

    // 2. Calcular ROB — UNA SOLA VEZ, inmutable (ADR-001)
    const robResult = this.robCalc.calculate(
      input.antecedents,
      input.antecedents.edad_al_embarazo,
    );

    // 3. Crear paciente + embarazo en transacción atómica
    const result = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          first_name:  input.patient.first_name,
          last_name:   input.patient.last_name,
          national_id: input.patient.national_id,
          birth_date:  new Date(input.patient.birth_date),
          phone:       input.patient.phone,
          health_ins:  input.patient.health_ins,
          blood_type:  input.patient.blood_type,
        },
      });

      const pregnancy = await tx.pregnancy.create({
        data: {
          patient_id:        patient.id,
          fum:               new Date(input.pregnancy.fum),
          fpp:               input.pregnancy.fpp ? new Date(input.pregnancy.fpp) : null,
          formula_g:         input.pregnancy.formula_g,
          formula_p:         input.pregnancy.formula_p,
          formula_a:         input.pregnancy.formula_a,
          formula_c:         input.pregnancy.formula_c,
          raw_antecedents:   input.antecedents,
          rob_status:        robResult.rob_status,
          rob_justification: robResult.justification,
          active:            true,
        },
      });

      return { patient, pregnancy };
    });

    // 4. Respuesta exacta del API Contract
    return {
      success: true,
      data: {
        patient_id:        result.patient.id,
        pregnancy_id:      result.pregnancy.id,
        rob_calculated:    result.pregnancy.rob_status,
        rob_justification: result.pregnancy.rob_justification,
        message:           `Paciente y embarazo creados exitosamente. ROB asignado: ${result.pregnancy.rob_status}`,
      },
    };
  }
}
