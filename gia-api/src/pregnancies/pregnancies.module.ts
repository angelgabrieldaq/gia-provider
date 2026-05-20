import { Module } from '@nestjs/common';
import { PregnanciesController } from './pregnancies.controller';
import { PregnanciesService } from './pregnancies.service';
import { ClinicalModule } from '../clinical/clinical.module';

@Module({
  imports: [ClinicalModule],
  controllers: [PregnanciesController],
  providers: [PregnanciesService],
})
export class PregnanciesModule {}
