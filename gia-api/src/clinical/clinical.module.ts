import { Module } from '@nestjs/common';
import { RobCalculationService } from './services/rob-calculation.service';
import { FasgoRiskService } from './services/fasgo-risk.service';

@Module({
  providers: [RobCalculationService, FasgoRiskService],
  exports: [RobCalculationService, FasgoRiskService],
})
export class ClinicalModule {}
