import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { ClinicalModule } from '../clinical/clinical.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ClinicalModule, PrismaModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
