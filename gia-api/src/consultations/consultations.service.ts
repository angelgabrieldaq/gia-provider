import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FasgoRiskService } from '../clinical/services/fasgo-risk.service';
import { CreateConsultationInput, CreateConsultationResponse } from './dto/create-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fasgoRiskService: FasgoRiskService,
  ) {}

  async findByPregnancy(pregnancyId: string) {
    const consultations = await this.prisma.consultation.findMany({
      where: { pregnancy_id: pregnancyId },
      include: { alerts: true },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: consultations.map((c) => ({
        consultation_id:          c.id,
        pregnancy_id:             c.pregnancy_id,
        created_at:               c.created_at,
        gestational_weeks:        c.gestational_weeks,
        weight_kg:                c.weight_kg,
        blood_pressure_systolic:  c.blood_pressure_systolic,
        blood_pressure_diastolic: c.blood_pressure_diastolic,
        fetal_heart_rate_bpm:     c.fetal_heart_rate_bpm,
        uterine_height_cm:        c.uterine_height_cm,
        proteinuria:              c.proteinuria,
        eca_calculated:           c.eca_calculated,
        symptoms: {
          edema:               c.symp_edema,
          headache:            c.symp_headache,
          vision_changes:      c.symp_vision_changes,
          contractions:        c.symp_contractions,
          bleeding:            c.symp_bleeding,
          amniotic_fluid_loss: c.symp_amniotic_fluid_loss,
        },
        triggered_alerts: c.alerts.map((a) => ({
          rule_id:  a.rule_id,
          message:  a.message,
          severity: a.severity,
        })),
      })),
    };
  }

  async createConsultation(input: CreateConsultationInput): Promise<CreateConsultationResponse> {
    // PASO 1: Buscar el embarazo — ROB se extrae de BD, nunca del frontend (Regla H002)
    const pregnancy = await this.prisma.pregnancy.findUnique({
      where: { id: input.pregnancy_id },
    });

    if (!pregnancy) {
      throw new NotFoundException(`Embarazo con ID ${input.pregnancy_id} no encontrado`);
    }

    // PASO 2: Leer ROB inmutable desde BD
    const rob_status = pregnancy.rob_status as 'BAJO' | 'MODERADO' | 'ALTO';

    // PASO 3: Calcular ECA con FasgoRiskService
    let ecaResult;
    try {
      ecaResult = this.fasgoRiskService.calculate({
        rob_status,
        gestational_weeks: input.gestational_weeks,
        vital_signs: input.vital_signs,
        symptoms: input.symptoms,
        proteinuria: input.proteinuria,
        clinical_notes: input.clinical_notes,
      });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw error;
    }

    // PASO 4: Persistencia atómica — consulta + alertas juntas o ninguna
    const result = await this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          pregnancy_id:              input.pregnancy_id,
          gestational_weeks:         input.gestational_weeks,
          weight_kg:                 input.vital_signs.weight_kg,
          blood_pressure_systolic:   input.vital_signs.blood_pressure_systolic,
          blood_pressure_diastolic:  input.vital_signs.blood_pressure_diastolic,
          fetal_heart_rate_bpm:      input.vital_signs.fetal_heart_rate_bpm ?? null,
          uterine_height_cm:         input.vital_signs.uterine_height_cm ?? null,
          proteinuria:               input.proteinuria ?? 'Negativa',
          // Síntomas mapeados a columnas individuales del schema
          symp_edema:                input.symptoms?.edema ?? false,
          symp_headache:             input.symptoms?.headache ?? false,
          symp_vision_changes:       input.symptoms?.vision_changes ?? false,
          symp_contractions:         input.symptoms?.contractions ?? false,
          symp_bleeding:             input.symptoms?.bleeding ?? false,
          symp_amniotic_fluid_loss:  input.symptoms?.amniotic_fluid_loss ?? false,
          clinical_notes:            input.clinical_notes ?? null,
          eca_calculated:            ecaResult.eca_calculated,
        },
      });

      if (ecaResult.triggered_alerts.length > 0) {
        await tx.clinicalAlertLog.createMany({
          data: ecaResult.triggered_alerts.map((alert) => ({
            consultation_id: consultation.id,
            rule_id:         alert.rule_id,
            message:         alert.message,
            severity:        alert.severity,
          })),
        });
      }

      return consultation;
    });

    // PASO 5: Respuesta exacta del API Contract
    return {
      success: true,
      data: {
        consultation_id:  result.id,
        pregnancy_id:     result.pregnancy_id,
        eca_calculated:   ecaResult.eca_calculated,
        triggered_alerts: ecaResult.triggered_alerts,
      },
    };
  }
}
