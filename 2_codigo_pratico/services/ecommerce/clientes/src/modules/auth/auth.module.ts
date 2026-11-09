import { Module } from '@nestjs/common';
import { UserModule } from '@user/user.module';
import { TokenModule } from '@token/token.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { HashingService } from './services/hashing.service';
import { RateLimitService } from '@common/services/rate-limit.service';

@Module({
  imports: [UserModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService, HashingService, RateLimitService],
})
export class AuthModule {}
