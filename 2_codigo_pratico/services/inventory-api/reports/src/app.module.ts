import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './reports/interface/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ReportsModule,
  ],
})
export class AppModule {}
