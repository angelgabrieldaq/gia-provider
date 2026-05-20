import { z } from 'zod';

export const CreatePregnancySchema = z.object({
  patient: z.object({
    first_name:  z.string().min(1),
    last_name:   z.string().min(1),
    national_id: z.string().min(1),
    birth_date:  z.string().min(1),     // ISO date string "YYYY-MM-DD" o datetime
    phone:       z.string().optional(),
    health_ins:  z.string().optional(),
    blood_type:  z.string().optional(),
  }),
  pregnancy: z.object({
    fum:       z.string().min(1),       // ISO date string
    fpp:       z.string().optional(),
    formula_g: z.number().int().min(0).optional(),
    formula_p: z.number().int().min(0).optional(),
    formula_a: z.number().int().min(0).optional(),
    formula_c: z.number().int().min(0).optional(),
  }),
  antecedents: z.object({
    hta_cronica:          z.boolean().default(false),
    diabetes_previa:      z.boolean().default(false),
    preeclampsia_previa:  z.boolean().default(false),
    imc_inicial:          z.number().optional(),
    edad_al_embarazo:     z.number().int().min(15).max(55),
    lupus:                z.boolean().default(false),
    trombofilia:          z.boolean().default(false),
  }),
});

export type CreatePregnancyInput = z.infer<typeof CreatePregnancySchema>;
