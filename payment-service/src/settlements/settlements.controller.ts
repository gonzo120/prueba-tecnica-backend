import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import type { Merchant } from '@prisma/client';

@Controller('settlements')
@UseGuards(ApiKeyGuard)
export class SettlementsController {
    constructor(private readonly settlementsService: SettlementsService) { }

    @Post('generate')
    @HttpCode(HttpStatus.CREATED)
    async generate(
        @Body() generateDto: GenerateSettlementDto,
        @CurrentMerchant() merchant: Merchant,
    ) {
        // Asegurar que el merchant_id coincida con el autenticado
        generateDto.merchant_id = merchant.id;
        return this.settlementsService.generate(generateDto);
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentMerchant() merchant: Merchant,
    ) {
        return this.settlementsService.findOne(id, merchant.id);
    }
}