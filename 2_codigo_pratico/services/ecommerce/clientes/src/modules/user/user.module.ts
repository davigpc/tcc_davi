import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './controllers/user.controller';
import { ProfileController } from './controllers/profile.controller';
import { InternalUserController } from './controllers/internal-user.controller';
import { UserService } from './services/user.service';
import { CustomerIdService } from './services/customer-id.service';
import { User, UserSchema } from './schemas/user.schema';
import { LocalStorageService } from '@storages/services/local-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UserService, CustomerIdService, LocalStorageService],
  controllers: [UserController, ProfileController, InternalUserController],
  exports: [UserService],
})
export class UserModule {}
