import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import {
  CreateConsultationSchema,
  CreateConsultationResponse,
} from './dto/create-consultation.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/consultations')
@UseGuards(AuthGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<CreateConsultationResponse> {
    const parsed = CreateConsultationSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: `Validación fallida: ${parsed.error.issues.map((e) => e.message).join(', ')}`,
        code: 'VALIDATION_ERROR',
        fields: parsed.error.issues.map((e) => ({
          path: e.path.map(String).join('.'),
          message: e.message,
        })),
      });
    }

    return this.consultationsService.createConsultation(parsed.data);
  }
}
