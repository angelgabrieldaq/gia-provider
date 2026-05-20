import { z } from 'zod';

// ========== SCHEMAS ZOD ==========

const VitalSignsSchema = z.object({
  weight_kg: z.number().min(30).max(200),
  blood_pressure_systolic: z.number().min(60).max(220),
  blood_pressure_diastolic: z.number().min(40).max(140),
  fetal_heart_rate_bpm: z.number().int().min(0).max(220).optional(),
  uterine_height_cm: z.number().min(0).max(50).optional(),
});

const SymptomsSchema = z.object({
  edema: z.boolean().optional(),
  headache: z.boolean().optional(),
  vision_changes: z.boolean().optional(),
  contractions: z.boolean().optional(),
  bleeding: z.boolean().optional(),
  amniotic_fluid_loss: z.boolean().optional(),
}).optional();

export const CreateConsultationSchema = z.object({
  pregnancy_id: z.string().uuid(),
  gestational_weeks: z.number().int().min(4).max(44),
  vital_signs: VitalSignsSchema,
  symptoms: SymptomsSchema,
  proteinuria: z
    .enum(['Negativa', 'Trazas', '1+', '2+', '3+'])
    .optional(),
  clinical_notes: z.string().max(2000).optional(),
});

export type CreateConsultationInput = z.infer<typeof CreateConsultationSchema>;

// ========== DTOs DE RESPUESTA ==========

export interface TriggeredAlertResponse {
  rule_id: string;
  message: string;
  severity: 'INFORMATIVE' | 'MODERATE' | 'HARD' | 'SOFT';
}

export interface CreateConsultationResponse {
  success: boolean;
  data: {
    consultation_id: string;
    pregnancy_id: string;
    eca_calculated: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL';
    triggered_alerts: TriggeredAlertResponse[];
  };
}
