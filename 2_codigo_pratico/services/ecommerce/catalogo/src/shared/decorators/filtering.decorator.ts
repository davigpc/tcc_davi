import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface Filtering {
  [key: string]: string | string[];
}

export const FilteringParams = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Filtering => {
    const request = ctx.switchToHttp().getRequest();
    const filters: any = {};

    for (const key in request.query) {
      if (
        request.query.hasOwnProperty(key) &&
        !['page', 'limit', 'size', 'offset'].includes(key)
      ) {
        filters[key] =
          key === 'category'
            ? request.query[key].split(',')
            : request.query[key];
      }
    }

    return filters;
  },
);
