import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

/**
 * Endpoints internos de leitura da Identidade.
 * Usados pelo serviço de Estoque (validação de usuário em movimentos) via HTTP.
 */
@Controller('internal')
export class InternalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users/:id')
  async user(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt !== null) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouseId,
    };
  }
}
