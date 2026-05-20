import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClinicalModule } from './clinical/clinical.module';
import { PrismaModule } from './prisma/prisma.module';
import { PregnanciesModule } from './pregnancies/pregnancies.module';

@Module({
  imports: [PrismaModule, ClinicalModule, PregnanciesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
