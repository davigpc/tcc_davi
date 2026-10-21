import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

/**
 * Endpoints internos de leitura do serviço de Estoque.
 * Usados pelo serviço de Relatórios (camada anticorrupção via HTTP).
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

  @Get('movements')
  async movements(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
