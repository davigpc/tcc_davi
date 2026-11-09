import { Body, Controller, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '@user/services/user.service';

/**
 * Rota interna do serviço de Clientes.
 *
 * O webhook de assinatura do monólito atualiza o status mensal do usuário por
 * aqui, direto pela rede dos contêineres. Não passa pelo gateway.
 */
@ApiTags('Internal')
@Controller('internal/users')
export class InternalUserController {
  public constructor(private readonly userService: UserService) {}

  @Patch('subscription')
  @ApiOperation({ summary: 'Update monthly subscription status' })
  public async updateSubscription(
    @Body()
    body: { stripe_customer_id: string; status: string },
  ): Promise<{ updated: boolean }> {
    await this.userService.updateMonthlySubscriptionStatus(
      body.stripe_customer_id,
      body.status,
    );
    return { updated: true };
  }
}
