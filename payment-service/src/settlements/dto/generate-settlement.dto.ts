import { IsUUID, IsISO8601 } from 'class-validator';

export class GenerateSettlementDto {
    @IsUUID()
    merchant_id: string;

    @IsISO8601()
    period_start: string;

    @IsISO8601()
    period_end: string;
}