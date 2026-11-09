import { Pagination } from '@shared/decorators/pagination.decorator';
import { FilterQuery, Model, Document } from 'mongoose';
import { Logger } from '@nestjs/common';

export class SearchService<T extends Document> {
  private readonly logger = new Logger(SearchService.name);

  public constructor(private readonly model: Model<T>) {}

  public async searchWithPaginationAndFilters(
    pagination: Pagination,
    filters: Record<string, any> = {},
  ): Promise<T[]> {
    return this.executeSearch(filters, pagination);
  }

  public async searchWithPaginationAndText(
    pagination: Pagination,
    text: string,
  ): Promise<T[]> {
    const searchQuery: FilterQuery<T> = { $text: { $search: text } };
    return this.executeSearch(searchQuery, pagination);
  }

  private async executeSearch(
    query: FilterQuery<T>,
    { limit, offset }: Pagination,
  ): Promise<T[]> {
    try {
      return await this.model.find(query).skip(offset).limit(limit).lean();
    } catch (error) {
      this.logger.error('Error executing search', error.stack);
      throw error;
    }
  }
}
