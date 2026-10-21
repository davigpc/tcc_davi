import { REPORT_REPOSITORY } from '@shared/infrastructure/constants/repository.symbols';
import { Module } from '@nestjs/common';
import { ReportRepositoryAdapter } from '@reports/infrastructure/adapters';
import {
  GetStockReportUseCase,
  GetAlertsReportUseCase,
  GetMovementHistoryReportUseCase,
} from '@reports/application';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportRepositoryAdapter,
    {
      provide: REPORT_REPOSITORY,
      useClass: ReportRepositoryAdapter,
    },
    GetStockReportUseCase,
    GetAlertsReportUseCase,
    GetMovementHistoryReportUseCase,
  ],
  exports: [REPORT_REPOSITORY],
})
export class ReportsModule {}
