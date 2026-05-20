-- Enable uuid-ossp extension (required by uuid_generate_v4 in schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "RobLevel" AS ENUM ('BAJO', 'MODERADO', 'ALTO');

-- CreateEnum
CREATE TYPE "EcaStatus" AS ENUM ('STABLE', 'WATCHFUL', 'ALERT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFORMATIVE', 'MODERATE', 'HARD', 'SOFT');

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "national_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "health_ins" TEXT,
    "blood_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregnancies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "patient_id" UUID NOT NULL,
    "fum" TIMESTAMP(3) NOT NULL,
    "fpp" TIMESTAMP(3),
    "formula_g" INTEGER,
    "formula_p" INTEGER,
    "formula_a" INTEGER,
    "formula_c" INTEGER,
    "raw_antecedents" JSONB NOT NULL,
    "rob_status" "RobLevel" NOT NULL,
    "rob_justification" TEXT[],
    "rob_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pregnancies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "pregnancy_id" UUID NOT NULL,
    "consultation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestational_weeks" INTEGER NOT NULL,
    "blood_pressure_systolic" INTEGER NOT NULL,
    "blood_pressure_diastolic" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "fetal_heart_rate_bpm" INTEGER,
    "uterine_height_cm" INTEGER,
    "proteinuria" TEXT,
    "symp_edema" BOOLEAN NOT NULL DEFAULT false,
    "symp_headache" BOOLEAN NOT NULL DEFAULT false,
    "symp_vision_changes" BOOLEAN NOT NULL DEFAULT false,
    "symp_contractions" BOOLEAN NOT NULL DEFAULT false,
    "symp_bleeding" BOOLEAN NOT NULL DEFAULT false,
    "symp_amniotic_fluid_loss" BOOLEAN NOT NULL DEFAULT false,
    "clinical_notes" TEXT,
    "conduct_taken" TEXT,
    "next_control_date" TIMESTAMP(3),
    "eca_calculated" "EcaStatus" NOT NULL,
    "eca_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_alerts_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "consultation_id" UUID NOT NULL,
    "rule_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_alerts_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_national_id_key" ON "patients"("national_id");

-- CreateIndex
CREATE INDEX "pregnancies_patient_id_idx" ON "pregnancies"("patient_id");

-- CreateIndex
CREATE INDEX "pregnancies_active_idx" ON "pregnancies"("active");

-- CreateIndex
CREATE INDEX "consultations_pregnancy_id_idx" ON "consultations"("pregnancy_id");

-- CreateIndex
CREATE INDEX "consultations_consultation_date_idx" ON "consultations"("consultation_date");

-- CreateIndex
CREATE INDEX "consultations_eca_calculated_idx" ON "consultations"("eca_calculated");

-- CreateIndex
CREATE INDEX "clinical_alerts_log_consultation_id_idx" ON "clinical_alerts_log"("consultation_id");

-- CreateIndex
CREATE INDEX "clinical_alerts_log_severity_idx" ON "clinical_alerts_log"("severity");

-- AddForeignKey
ALTER TABLE "pregnancies" ADD CONSTRAINT "pregnancies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_pregnancy_id_fkey" FOREIGN KEY ("pregnancy_id") REFERENCES "pregnancies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts_log" ADD CONSTRAINT "clinical_alerts_log_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
