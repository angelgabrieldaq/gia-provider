export interface AntecedentsInput {
  hta_cronica?: boolean;
  diabetes_previa?: boolean;
  preeclampsia_previa?: boolean;
  imc_inicial?: number;
  edad_al_embarazo?: number;
  lupus?: boolean;
  trombofilia?: boolean;
}

export interface RobResult {
  rob_status: 'BAJO' | 'MODERADO' | 'ALTO';
  justification: string[];
}
