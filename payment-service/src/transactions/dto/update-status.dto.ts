import { IsEnum } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class UpdateStatusDto {
    @IsEnum(TransactionStatus, {
        message: 'Status debe ser pending, approved, rejected, failed o completed'
    })
    status: TransactionStatus;
}