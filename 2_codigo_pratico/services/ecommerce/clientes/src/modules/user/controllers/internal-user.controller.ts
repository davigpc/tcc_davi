import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserService } from '@user/services/user.service';

/**
 * Rotas internas do serviço de Clientes.
 *
 * O webhook de assinatura do serviço de Vendas atualiza o status mensal por
 * aqui, e a validação do comprador no carrinho e no pedido consulta o usuário
 * por aqui. Não passam pelo gateway.
 */
@ApiTags('Internal')
@Controller('internal/users')
export class InternalUserController {
  public constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Check user existence' })
  public async getById(@Param('id') id: string) {
    const user = await this.userService.getUserById(id);
    return {
      _id: (user as any)._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

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
