import { Logger, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshToken, RerfreshTokenSchema } from './schemas/token.schema';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RerfreshTokenSchema },
    ]),
  ],
  providers: [TokenService, Logger, JwtService],
  exports: [TokenService],
})
export class TokenModule {}
