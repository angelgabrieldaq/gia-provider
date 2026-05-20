import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClinicalModule } from './clinical/clinical.module';

@Module({
  imports: [ClinicalModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
