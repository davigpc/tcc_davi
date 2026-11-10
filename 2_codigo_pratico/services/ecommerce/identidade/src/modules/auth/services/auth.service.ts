import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TokenService } from '@token/services/token.service';
import { UserService } from '@user/services/user.service';
import { LoginCredentialsDto } from '@auth/dto/login-credentials.dto';
import { AuthResponseDto } from '@auth/dto/auth-response.dto';
import { CreateTokenDto } from '@token/dto/create-token.dto';
import { IAuthService } from '@auth/interfaces/auth.service.interface';
import { RegisterCredentialsDto } from '@auth/dto/register-credentials.dto';
import { HashingService } from './hashing.service';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  public constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly hashingService: HashingService,
  ) {}

  public async login(
    credentials: LoginCredentialsDto,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Attempting login for email: ${credentials.email}`);

    try {
      const user = await this.validateUser(credentials);
      const response = await this.generateAuthResponse(user);
      this.logger.log(`Login successful for email: ${credentials.email}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Login failed for email: ${credentials.email}`,
        error.stack,
      );
      throw error;
    }
  }

  public async register(
    credentials: RegisterCredentialsDto,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Attempting registration for email: ${credentials.email}`);
    try {
      const existingUser = await this.userService.getUserByEmail(
        credentials.email,
      );
      if (existingUser) {
        this.logger.warn(
          `Registration failed: User already exists for email: ${credentials.email}`,
        );
        throw new ConflictException('User already exists');
      }

      const hashedPassword = await this.hashingService.hashPassword(
        credentials.password,
      );

      const user = await this.userService.createUser({
        ...credentials,
        password: hashedPassword,
      });

      const userWithoutPassword = plainToInstance(CreateTokenDto, user, {
        excludeExtraneousValues: true,
      });

      this.logger.log(
        `Registration successful for email: ${credentials.email}`,
      );
      return this.generateAuthResponse(userWithoutPassword);
    } catch (error) {
      this.logger.error(
        `Registration failed for email: ${credentials.email}`,
        error.stack,
      );
      throw error;
    }
  }

  public async refresh(token: string): Promise<AuthResponseDto> {
    this.logger.log(`Attempting token refresh`);
    if (!token) {
      this.logger.warn(`Token refresh failed: Token not provided`);
      throw new UnauthorizedException('Token not provided');
    }

    try {
      const userPayload = await this.tokenService.verifyRefreshToken(token);
      const response = await this.generateAuthResponse(userPayload);
      this.logger.log(`Token refresh successful`);
      return response;
    } catch (error) {
      this.logger.error(`Token refresh failed`, error.stack);
      throw error;
    }
  }

  public async logout(refreshToken: string): Promise<void> {
    this.logger.log(`Attempting logout`);

    try {
      await this.tokenService.revokeRefreshToken(refreshToken);
      this.logger.log(`Logout successful`);
    } catch (error) {
      this.logger.error(`Logout failed`, error.stack);
      throw error;
    }
  }

  private async generateAuthResponse(
    tokenPayload: CreateTokenDto,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Generating authentication response`);

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(tokenPayload),
      this.tokenService.generateRefreshToken(tokenPayload),
    ]);

    this.logger.log(`Authentication response generated`);

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: tokenPayload,
    };
  }

  private async validateUser(
    credentials: LoginCredentialsDto,
  ): Promise<CreateTokenDto> {
    this.logger.log(`Validating user for email: ${credentials.email}`);
    const user = await this.userService.getUserByEmail(credentials.email);

    if (!user) {
      this.logger.warn(
        `Validation failed: User not found for email: ${credentials.email}`,
      );
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await this.hashingService.verifyPassword(
      user.password,
      credentials.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Validation failed: Invalid password for email: ${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid password');
    }

    this.logger.log(`User validated for email: ${credentials.email}`);
    return plainToInstance(CreateTokenDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
