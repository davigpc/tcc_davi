import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column({ name: 'auction_id', type: 'uuid' })
  auctionId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
