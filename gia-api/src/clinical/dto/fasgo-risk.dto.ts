export interface VitalSigns {
  weight_kg: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  fetal_heart_rate_bpm?: number;
  uterine_height_cm?: number;
}

export interface Symptoms {
  edema?: boolean;
  headache?: boolean;
  vision_changes?: boolean;
  contractions?: boolean;
  bleeding?: boolean;
  amniotic_fluid_loss?: boolean;
}

export interface ConsultationInput {
  rob_status: 'BAJO' | 'MODERADO' | 'ALTO';
  gestational_weeks: number;
  vital_signs: VitalSigns;
  symptoms?: Symptoms;
  proteinuria?: string; // 'Negativa' | 'Trazas' | '1+' | '2+' | '3+'
  clinical_notes?: string;
}

export interface TriggeredAlert {
  rule_id: string;
  message: string;
  severity: 'INFORMATIVE' | 'MODERATE' | 'HARD' | 'SOFT';
}

export interface EcaResult {
  eca_calculated: 'STABLE' | 'WATCHFUL' | 'ALERT' | 'CRITICAL';
  triggered_alerts: TriggeredAlert[];
}
