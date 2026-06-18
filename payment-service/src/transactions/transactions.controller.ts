import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';
import type { Merchant } from '@prisma/client';

@Controller('transactions')
@UseGuards(ApiKeyGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    async create(
        @Body() createTransactionDto: CreateTransactionDto,
        @CurrentMerchant() merchant: Merchant,
    ) {
        // Asegurar que el merchant_id coincida con el autenticado
        createTransactionDto.merchant_id = merchant.id;
        return this.transactionsService.create(createTransactionDto);
    }

    @Get()
    async findAll(
        @Query() query: QueryTransactionsDto,
        @CurrentMerchant() merchant: Merchant,
    ) {
        return this.transactionsService.findAll({
            ...query,
            merchant_id: merchant.id,
        });
    }

    @Get(':id')
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentMerchant() merchant: Merchant,
    ) {
        return this.transactionsService.findOne(id, merchant.id);
    }

    @Patch(':id/status')
    @HttpCode(HttpStatus.OK)
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateStatusDto: UpdateStatusDto,
        @CurrentMerchant() merchant: Merchant,
    ) {
        return this.transactionsService.updateStatus(id, updateStatusDto.status, merchant.id);
    }
}