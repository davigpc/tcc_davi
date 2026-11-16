import { AuctionStatus } from './auction.entity';

export interface PublicUser {
  id: string;
  email: string;
  username: string;
}

export interface CardTypeSummary {
  id: string;
  name: string;
  attack: number;
  midfield: number;
  defense: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidSummary {
  id: string;
  auctionId: string;
  bidderUserId: string;
  amount: number;
  createdAt: Date;
}

export interface CardSummary {
  id: string;
  status: string;
  cardType: CardTypeSummary;
  owner: PublicUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternalCard {
  id: string;
  status: string;
  cardType: CardTypeSummary;
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BidSummaryResponse = BidSummary;

export interface InternalAuction {
  id: string;
  cardId: string;
  sellerUserId: string;
  status: AuctionStatus;
  startPrice: number;
  endTime: Date;
  currentHighestBidId: string | null;
}

export interface AuctionResponse {
  id: string;
  cardId: string;
  sellerUserId: string;
  status: AuctionStatus;
  startPrice: number;
  currentHighestBid: BidSummaryResponse | null;
  startTime: Date;
  endTime: Date;
  closedAt: Date | null;
  cancelledAt: Date | null;
}

export interface AuctionDetailResponse extends AuctionResponse {
  card: CardSummary;
  seller: PublicUser;
  recentBids: BidSummaryResponse[];
}

export interface AuctionsPage {
  items: AuctionDetailResponse[];
  nextCursor: string | null;
}
