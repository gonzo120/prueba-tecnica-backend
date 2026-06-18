import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
    imports: [TransactionsModule],
    controllers: [SettlementsController],
    providers: [SettlementsService],
})
export class SettlementsModule { }