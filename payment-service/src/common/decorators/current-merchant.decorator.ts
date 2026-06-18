import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Merchant } from '@prisma/client';

export const CurrentMerchant = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): Merchant => {
        const request = ctx.switchToHttp().getRequest();
        const merchant = request.merchant;

        if (!merchant) {
            throw new UnauthorizedException('Merchant no autenticado');
        }

        return merchant;
    },
);