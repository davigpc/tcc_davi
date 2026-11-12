import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Observable, catchError, tap } from 'rxjs';
import mongoose from 'mongoose';

export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  public constructor(
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    const session: mongoose.ClientSession =
      await this.connection.startSession();

    request.mongooseSession = session;

    this.logger.debug('MongoDB session started and transaction initiated');

    session.startTransaction();
    return next.handle().pipe(
      tap(() => this.commitTransaction(session)),
      catchError((error) => this.abortTransaction(session, error)),
    );
  }

  private async commitTransaction(session: mongoose.ClientSession) {
    this.logger.debug('Committing transaction');
    await session.commitTransaction();
    await session.endSession();
    this.logger.debug('Transaction committed and session ended');
  }

  private async abortTransaction(session: mongoose.ClientSession, error: any) {
    this.logger.debug('Aborting transaction due to error:', error);
    await session.abortTransaction();
    await session.endSession();
    this.logger.debug('Transaction aborted and session ended');
    throw error;
  }
}
