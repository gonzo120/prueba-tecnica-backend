import { SetMetadata } from '@nestjs/common';

export const CurrentMerchantDecorator = (...args: string[]) => SetMetadata('current-merchant.decorator', args);
