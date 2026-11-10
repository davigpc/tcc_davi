import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '@token/services/token.service';

@Injectable()
export class JwtAuthenticationGuard implements CanActivate {
  public constructor(private readonly tokenService: TokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers['authorization'];

    if (!authorization) {
      throw new UnauthorizedException('Token not provided');
    }
    const [bearer, token] = authorization.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid token');
    }
    try {
      request.user = await this.tokenService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}
