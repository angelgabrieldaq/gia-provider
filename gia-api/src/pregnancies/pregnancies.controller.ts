import { Controller, Post, Body, UseGuards, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PregnanciesService } from './pregnancies.service';
import { CreatePregnancySchema } from './dto/create-pregnancy.dto';

@Controller('api/pregnancies')
@UseGuards(AuthGuard)
export class PregnanciesController {
  constructor(private readonly pregnanciesService: PregnanciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown) {
    const parsed = CreatePregnancySchema.safeParse(body);
    if (!parsed.success) {
      // Zod v4: uses .issues instead of .errors
      throw new BadRequestException({
        success: false,
        error: `Validación fallida: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        code:   'VALIDATION_ERROR',
        fields: parsed.error.issues.map(e => ({
          path:    e.path.map(String).join('.'),
          message: e.message,
        })),
      });
    }
    return this.pregnanciesService.createPregnancy(parsed.data);
  }
}
