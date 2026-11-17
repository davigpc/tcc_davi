import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('idx_card_transfers_card_id', ['cardId'])
@Index('idx_card_transfers_from_user_id', ['fromUserId'])
@Index('idx_card_transfers_to_user_id', ['toUserId'])
@Index('idx_card_transfers_auction_id', ['auctionId'])
@Entity('card_transfers')
export class CardTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'card_id', type: 'uuid' })
  cardId!: string;

  @Column({ name: 'from_user_id', type: 'uuid' })
  fromUserId!: string;

  @Column({ name: 'to_user_id', type: 'uuid' })
  toUserId!: string;

  @Column({ name: 'auction_id', type: 'uuid', nullable: true })
  auctionId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
