import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '../clients/clients.module';
import { User } from './user.entity';
import { UsersDirectory } from './users.directory';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ClientsModule],
  providers: [UsersService, UsersDirectory],
  exports: [UsersService, UsersDirectory],
})
export class UsersModule {}
