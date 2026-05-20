import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RobCalculationService } from '../clinical/services/rob-calculation.service';
import { CreatePregnancyInput } from './dto/create-pregnancy.dto';

@Injectable()
export class PregnanciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly robCalc: RobCalculationService,
  ) {}

  async findOne(id: string) {
    const pregnancy = await this.prisma.pregnancy.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!pregnancy) {
      throw new NotFoundException(`Embarazo con ID ${id} no encontrado`);
    }

    const fumDate = new Date(pregnancy.fum);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalDays = Math.floor((Date.now() - fumDate.getTime()) / (24 * 60 * 60 * 1000));
    const egaWeeks = Math.floor(totalDays / 7);
    const egaDays  = totalDays % 7;

    return {
      success: true,
      data: {
        pregnancy_id:      pregnancy.id,
        patient_id:        pregnancy.patient_id,
        patient_name:      `${pregnancy.patient.first_name} ${pregnancy.patient.last_name}`,
        rob_status:        pregnancy.rob_status,
        rob_justification: pregnancy.rob_justification,
        fum:               pregnancy.fum,
        fpp:               pregnancy.fpp,
        ega_weeks:         egaWeeks,
        ega_days:          egaDays,
        active:            pregnancy.active,
        created_at:        pregnancy.created_at,
      },
    };
  }

  async createPregnancy(input: CreatePregnancyInput) {
    // 1. Calcular ROB — UNA SOLA VEZ, inmutable (ADR-001)
    const robResult = this.robCalc.calculate(
      input.antecedents,
      input.antecedents.edad_al_embarazo,
    );

    // 2. Upsert paciente + crear embarazo en transacción atómica.
    //    update: {} garantiza que los datos de la paciente NO se sobreescriben
    //    si ya existe — solo se reutiliza su id para el embarazo nuevo.
    const result = await this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.upsert({
        where:  { national_id: input.patient.national_id },
        update: {},
        create: {
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

    // 3. Respuesta exacta del API Contract
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
