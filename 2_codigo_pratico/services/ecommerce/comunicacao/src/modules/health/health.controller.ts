import { Controller, Get } from '@nestjs/common';

/**
 * Sonda de prontidão do serviço.
 *
 * A Comunicação não tem banco: basta o processo estar no ar.
 */
@Controller('health')
export class HealthController {
  @Get('db')
  public checkDb() {
    return { status: 'ok' };
  }
}
