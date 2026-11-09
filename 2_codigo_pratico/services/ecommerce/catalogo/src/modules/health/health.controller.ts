import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Sonda de prontidão do serviço.
 *
 * Substitui o `/api/health/db` do monólito, que usava `@nestjs/terminus`.
 * Aqui basta saber se a conexão com o Mongo está aberta.
 */
@Controller('health')
export class HealthController {
  public constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get('db')
  public checkDb() {
    return { status: this.connection.readyState === 1 ? 'ok' : 'down' };
  }
}
