import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { Nullable } from '@shared/types/common';
import { CreateTokenDto } from '@token/dto/create-token.dto';
import { ITokenService } from '@token/interfaces/token.service.interface';
import { RefreshToken } from '@token/schemas/token.schema';

@Injectable()
export class TokenService implements ITokenService {
  private readonly logger = new Logger(TokenService.name);

  private readonly jwtAccessOptions: JwtSignOptions;
  private readonly jwtRefreshOptions: JwtSignOptions;
  private readonly jwtAccessVerifyOptions: JwtVerifyOptions;
  private readonly jwtRefreshVerifyOptions: JwtVerifyOptions;

  public constructor(
    private readonly jwtService: JwtService,
    @InjectModel(RefreshToken.name)
    private readonly tokenModel: Model<RefreshToken>,
    private readonly configService: ConfigService,
  ) {
    this.jwtAccessOptions = {
      secret: this.configService.get<string>('ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('ACCESS_EXPIRATION_TIME'),
    };
    this.jwtRefreshOptions = {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('REFRESH_EXPIRATION_TIME'),
    };
    this.jwtAccessVerifyOptions = {
      secret: this.configService.get<string>('ACCESS_SECRET'),
    };
    this.jwtRefreshVerifyOptions = {
      secret: this.configService.get<string>('REFRESH_SECRET'),
    };
  }

  public async generateAccessToken(payload: CreateTokenDto): Promise<string> {
    this.logger.log(`Generating access token for user: ${payload._id}`);
    const token = this.jwtService.sign({ ...payload }, this.jwtAccessOptions);
    this.logger.log(`Generated access token for user: ${payload._id}`);
    return token;
  }

  public async generateRefreshToken(payload: CreateTokenDto): Promise<string> {
    this.logger.log(`Generating refresh token for user: ${payload._id}`);
    const refreshToken = this.jwtService.sign(
      { ...payload },
      this.jwtRefreshOptions,
    );
    const savedToken = await this.saveOrUpdateRefreshToken(
      payload._id,
      refreshToken,
    );
    this.logger.log(
      `Generated and saved refresh token for user: ${payload._id}`,
    );
    return savedToken;
  }

  public async revokeRefreshToken(refreshToken: string): Promise<void> {
    this.logger.log(`Revoking refresh token: ${refreshToken}`);
    try {
      await this.tokenModel.deleteOne({ refresh_token: refreshToken });
      this.logger.log(`Revoked refresh token: ${refreshToken}`);
    } catch (error) {
      this.logger.error(
        `Failed to revoke refresh token: ${refreshToken}`,
        error.stack,
      );
      throw new BadRequestException('Failed to revoke refresh token');
    }
  }

  public async verifyAccessToken(token: string): Promise<CreateTokenDto> {
    this.logger.log(`Verifying access token`);
    try {
      const payload = this.jwtService.verify(
        token,
        this.jwtAccessVerifyOptions,
      );
      this.logger.log(`Verified access token`);
      return plainToInstance(CreateTokenDto, payload);
    } catch (error) {
      this.logger.error('Invalid access token', error.stack);
      throw new BadRequestException('Invalid access token');
    }
  }

  public async verifyRefreshToken(
    refreshToken: string,
  ): Promise<CreateTokenDto> {
    this.logger.log(`Verifying refresh token`);
    const storedToken = await this.findRefreshToken(refreshToken);
    if (!storedToken) {
      this.logger.warn('Refresh token not found');
      throw new BadRequestException('Token not found');
    }
    try {
      const payload = this.jwtService.verify(
        refreshToken,
        this.jwtRefreshVerifyOptions,
      );
      this.logger.log(`Verified refresh token`);
      return plainToInstance(CreateTokenDto, payload);
    } catch (error) {
      this.logger.error('Invalid refresh token', error.stack);
      throw new BadRequestException('Invalid refresh token');
    }
  }

  private async findRefreshToken(
    refreshToken: string,
  ): Promise<Nullable<RefreshToken>> {
    this.logger.log(`Finding refresh token: ${refreshToken}`);
    const token = await this.tokenModel.findOne({
      refresh_token: refreshToken,
    });
    if (!token) {
      this.logger.warn(`Refresh token not found: ${refreshToken}`);
    } else {
      this.logger.log(`Found refresh token: ${refreshToken}`);
    }
    return token;
  }

  private async saveOrUpdateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<string> {
    this.logger.log(`Saving or updating refresh token for user: ${userId}`);

    let existingToken = await this.tokenModel.findOne({
      user: userId,
    });

    if (existingToken) {
      this.logger.log(`Existing token found for user: ${userId}`);
      existingToken.refresh_token = refreshToken;
    } else {
      this.logger.log(
        `No existing token found for user: ${userId}, creating new token`,
      );
      existingToken = new this.tokenModel({
        user: userId,
        refresh_token: refreshToken,
      });
    }

    await existingToken.save();
    this.logger.log(`Refresh token saved for user: ${userId}`);
    return existingToken.refresh_token;
  }
}
