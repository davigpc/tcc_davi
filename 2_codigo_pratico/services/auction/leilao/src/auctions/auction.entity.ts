import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BidSummary } from './auctions.types';

export enum AuctionStatus {
  ACTIVE = 'ACTIVE',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Check('"start_price" >= 0')
@Check('"end_time" > "start_time"')
@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'card_id', type: 'uuid' })
  cardId!: string;

  @Column({ name: 'seller_user_id', type: 'uuid' })
  sellerUserId!: string;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    enumName: 'auction_status',
    default: AuctionStatus.ACTIVE,
  })
  status!: AuctionStatus;

  @Column({ name: 'start_price', type: 'int' })
  startPrice!: number;

  @Column({ name: 'current_highest_bid_id', type: 'uuid', nullable: true })
  currentHighestBidId!: string | null;

  @Column({ name: 'highest_bid', type: 'jsonb', nullable: true })
  highestBid!: BidSummary | null;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;
}
