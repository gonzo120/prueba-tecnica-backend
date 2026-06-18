import { IsEnum, IsUUID, IsPositive, IsObject, IsOptional, IsString } from 'class-validator';
import { TransactionType, Currency } from '@prisma/client';

export class CreateTransactionDto {
    @IsUUID()
    merchant_id: string;

    @IsPositive()
    amount: number;

    @IsEnum(Currency)
    currency: Currency;

    @IsEnum(TransactionType)
    type: TransactionType;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}