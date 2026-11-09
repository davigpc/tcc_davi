import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  private requestCounts: Map<string, { count: number; lastRequest: number }> =
    new Map();
  private readonly limit: number = 5;
  private readonly timeWindow: number = 60000; // 1-minute time window

  public async checkRateLimit(key: string): Promise<void> {
    const currentTime = Date.now();
    const requestInfo = this.requestCounts.get(key);

    if (requestInfo) {
      const timeDiff = currentTime - requestInfo.lastRequest;

      if (timeDiff < this.timeWindow) {
        if (requestInfo.count >= this.limit) {
          throw new BadRequestException(
            `Rate limit exceeded. Try again in ${Math.ceil(
              (this.timeWindow - timeDiff) / 1000,
            )} seconds.`,
          );
        }
        requestInfo.count++;
      } else {
        this.requestCounts.set(key, { count: 1, lastRequest: currentTime });
      }
    } else {
      this.requestCounts.set(key, { count: 1, lastRequest: currentTime });
    }
  }
}
