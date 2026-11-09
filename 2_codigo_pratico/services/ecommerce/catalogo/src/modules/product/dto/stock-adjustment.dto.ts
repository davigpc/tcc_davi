import { IsInt, Min } from 'class-validator';

/** Corpo da rota interna de baixa de estoque, chamada pelo monólito. */
export class StockAdjustmentDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
