import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            throw new UnauthorizedException('API Key requerida');
        }

        // Buscar merchant por API key
        const merchant = await this.prisma.merchant.findUnique({
            where: { api_key: apiKey },
        });

        if (!merchant) {
            throw new UnauthorizedException('API Key inválida');
        }

        if (merchant.status === 'inactive') {
            throw new ForbiddenException('Merchant inactivo');
        }

        // Inyectar merchant en el request
        request.merchant = merchant;
        return true;
    }
}