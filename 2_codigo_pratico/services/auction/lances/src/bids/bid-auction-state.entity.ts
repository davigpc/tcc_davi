import {
  Check,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Estado local do leilao no servico de Lances.
 *
 * Com o banco isolado, a invariante de "lance sempre crescente" precisa ser
 * verificada sem consultar a base do Leilao. Esta tabela guarda a copia dos
 * campos usados na validacao e o maior lance conhecido; o servico de Leilao
 * mantem a sua propria projecao, atualizada por chamada interna.
 */
@Check('"start_price" >= 0')
@Entity('bid_auction_state')
export class BidAuctionState {
  @PrimaryColumn({ name: 'auction_id', type: 'uuid' })
  auctionId!: string;

  @Column({ name: 'seller_user_id', type: 'uuid' })
  sellerUserId!: string;

  @Column({ name: 'status', type: 'varchar' })
  status!: string;

  @Column({ name: 'start_price', type: 'int' })
  startPrice!: number;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @Column({ name: 'highest_bid_id', type: 'uuid', nullable: true })
  highestBidId!: string | null;

  @Column({ name: 'highest_bid_amount', type: 'int', nullable: true })
  highestBidAmount!: number | null;

  @Column({ name: 'highest_bid_bidder_user_id', type: 'uuid', nullable: true })
  highestBidBidderUserId!: string | null;

  @Column({
    name: 'highest_bid_created_at',
    type: 'timestamptz',
    nullable: true,
  })
  highestBidCreatedAt!: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
