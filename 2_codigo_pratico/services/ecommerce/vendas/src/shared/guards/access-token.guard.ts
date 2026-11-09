import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Validação local do token de acesso.
 *
 * Depois da extração de Clientes (Capacidade de Negócio / snapshot-2), quem
 * assina o token é o serviço de Clientes. A verificação continua no monólito
 * porque é stateless: basta a mesma chave `ACCESS_SECRET`, sem consultar banco
 * nem outro serviço. É o que mantém `POST /api/orders` sem salto de rede na
 * rota medida.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  public constructor(private readonly jwtService: JwtService) {}

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
      request.user = this.jwtService.verify(token, {
        secret: process.env.ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }
}
