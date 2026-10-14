import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

/**
 * Endpoints internos de leitura do serviço de Suporte (contexto de suporte).
 * Usados por outros serviços (camada anticorrupção via HTTP).
 */
@Controller('internal')
export class InternalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('warehouses')
  async warehouses() {
    return this.prisma.warehouse.findMany({ where: { deletedAt: null } });
  }

  @Get('warehouses/:id')
  async warehouse(@Param('id') id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse || warehouse.deletedAt !== null) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    return warehouse;
  }

  @Get('products')
  async products() {
    return this.prisma.product.findMany({ where: { deletedAt: null } });
  }
}
