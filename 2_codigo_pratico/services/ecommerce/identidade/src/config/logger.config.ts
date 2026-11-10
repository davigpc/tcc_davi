import { LogLevel } from '@nestjs/common';

export const loggerOptions: LogLevel[] =
  process.env.NODE_ENV === 'development'
    ? ['log', 'debug', 'error', 'verbose', 'warn']
    : ['error', 'warn', 'log'];
