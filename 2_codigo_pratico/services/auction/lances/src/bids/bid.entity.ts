import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('idx_bids_auction_amount', ['auctionId', 'amount'])
@Index('idx_bids_bidder_user_id', ['bidderUserId'])
@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'auction_id', type: 'uuid' })
  auctionId!: string;

  @Column({ name: 'bidder_user_id', type: 'uuid' })
  bidderUserId!: string;

  @Column({ type: 'int' })
  amount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
