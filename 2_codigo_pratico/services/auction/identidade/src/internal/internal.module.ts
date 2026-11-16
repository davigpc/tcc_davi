import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { InternalUsersController } from './internal-users.controller';

@Module({
  imports: [UsersModule],
  controllers: [InternalUsersController],
})
export class InternalModule {}
