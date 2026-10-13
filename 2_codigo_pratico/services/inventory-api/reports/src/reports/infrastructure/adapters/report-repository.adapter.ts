import { Injectable, NotFoundException } from '@nestjs/common';
import { IReportRepository } from '@reports/application/ports';
import {
  StockReportItemDto,
  StockReportResultDto,
  AlertItemDto,
  AlertsReportResultDto,
  MovementHistoryItemDto,
  MovementHistoryReportResultDto,
} from '@reports/application/dtos';
import { MovementTypeMapper } from '@reports/infrastructure/mappers';

interface WarehouseRow {
  id: string;
  name: string;
  isActive: boolean;
  deletedAt: string | null;
}
interface ProductRow {
  id: string;
  sku: string;
  name: string;
  minStockAlert: number;
  deletedAt: string | null;
}
interface MovementRow {
  id: string;
  productId: string;
  warehouseId: string;
  userId: string;
  userEmail: string | null;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
}

/**
 * ReportRepositoryAdapter
 *
 * Com a persistência isolada, o serviço de Relatórios NÃO tem banco próprio:
 * ele consulta os dados do serviço de Estoque pela API interna (camada
 * anticorrupção via HTTP) e agrega em memória.
 */
@Injectable()
export class ReportRepositoryAdapter implements IReportRepository {
  private readonly estoqueUrl =
    process.env.ESTOQUE_URL || 'http://estoque:3000';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchData<T>(path: string): Promise<T> {
    const res = await fetch(`${this.estoqueUrl}${path}`);
    if (!res.ok) {
      throw new Error(`estoque service error ${res.status} at ${path}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    return body?.data ?? body;
  }

  private async allMovements(): Promise<MovementRow[]> {
    const resp = await this.fetchData<{ data: MovementRow[] }>(
      '/api/internal/movements?page=1&limit=1000000',
    );
    return resp.data;
  }

  private async stockOf(
    movements: MovementRow[],
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    let stock = 0;
    for (const m of movements) {
      if (m.productId === productId && m.warehouseId === warehouseId) {
        if (m.type === MovementTypeMapper.toPersistence('ENTRADA')) stock += m.quantity;
        else if (m.type === MovementTypeMapper.toPersistence('SALIDA')) stock -= m.quantity;
      }
    }
    return stock;
  }

  async getStockReport(warehouseId: string): Promise<StockReportResultDto> {
    const warehouses = await this.fetchData<WarehouseRow[]>(
      '/api/internal/warehouses',
    );
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    const products = await this.fetchData<ProductRow[]>(
      '/api/internal/products',
    );
    const movements = await this.allMovements();

    const items: StockReportItemDto[] = [];
    for (const product of products) {
      const quantity = await this.stockOf(movements, product.id, warehouseId);
      items.push(
        new StockReportItemDto(
          product.id,
          product.sku,
          product.name,
          Math.max(0, quantity),
          product.minStockAlert,
        ),
      );
    }

    return new StockReportResultDto(warehouse.id, warehouse.name, items);
  }

  async getAlertsReport(): Promise<AlertsReportResultDto> {
    const products = await this.fetchData<ProductRow[]>(
      '/api/internal/products',
    );
    const warehouses = await this.fetchData<WarehouseRow[]>(
      '/api/internal/warehouses',
    );
    const movements = await this.allMovements();

    const alerts: AlertItemDto[] = [];
    for (const product of products) {
      for (const warehouse of warehouses) {
        const currentStock = await this.stockOf(
          movements,
          product.id,
          warehouse.id,
        );
        if (currentStock < product.minStockAlert) {
          alerts.push(
            new AlertItemDto(
              product.id,
              product.sku,
              product.name,
              warehouse.id,
              warehouse.name,
              Math.max(0, currentStock),
              product.minStockAlert,
            ),
          );
        }
      }
    }

    return new AlertsReportResultDto(alerts);
  }

  async getMovementHistoryReport(
    productId?: string,
    warehouseId?: string,
    type?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<MovementHistoryReportResultDto> {
    const params = new URLSearchParams();
    if (productId) params.set('productId', productId);
    if (warehouseId) params.set('warehouseId', warehouseId);
    if (type) params.set('type', MovementTypeMapper.toPersistence(type));
    if (startDate) params.set('startDate', startDate.toISOString());
    if (endDate) params.set('endDate', endDate.toISOString());
    params.set('page', String(page));
    params.set('limit', String(limit));

    const [resp, products, warehouses] = await Promise.all([
      this.fetchData<{
        data: MovementRow[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/internal/movements?${params.toString()}`),
      this.fetchData<ProductRow[]>('/api/internal/products'),
      this.fetchData<WarehouseRow[]>('/api/internal/warehouses'),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const data = resp.data.map(
      (m) =>
        new MovementHistoryItemDto(
          m.id,
          productMap.get(m.productId)?.sku ?? '',
          productMap.get(m.productId)?.name ?? '',
          warehouseMap.get(m.warehouseId)?.name ?? '',
          m.type,
          m.quantity,
          m.userEmail ?? '',
          m.notes,
          new Date(m.createdAt),
        ),
    );

    return new MovementHistoryReportResultDto(
      data,
      resp.total,
      resp.page,
      resp.limit,
      resp.totalPages,
    );
  }
}
