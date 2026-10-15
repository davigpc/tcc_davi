import { Injectable } from '@nestjs/common';
import type { IWarehouseValidator } from '../../domain/ports/user.repository.port';

/**
 * Camada anticorrupção: o serviço de Identidade não tem a tabela de armazéns
 * (propriedade do serviço de Suporte). Valida a existência/atividade do armazém
 * pela API interna do Suporte via HTTP.
 */
@Injectable()
export class WarehouseValidatorAdapter implements IWarehouseValidator {
  private readonly supportUrl = process.env.SUPPORT_URL || 'http://support:3000';

  async existsAndIsActive(id: string): Promise<boolean> {
    const res = await fetch(`${this.supportUrl}/api/internal/warehouses/${id}`);
    if (res.status === 404) return false;
    if (!res.ok) {
      throw new Error(`support service error ${res.status} for warehouse ${id}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    const warehouse = body?.data ?? body;
    return (
      warehouse !== null &&
      warehouse.isActive === true &&
      warehouse.deletedAt === null
    );
  }
}
