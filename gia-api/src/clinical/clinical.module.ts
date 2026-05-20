import { Module } from '@nestjs/common';
import { RobCalculationService } from './services/rob-calculation.service';

@Module({
  providers: [RobCalculationService],
  exports: [RobCalculationService],
})
export class ClinicalModule {}
