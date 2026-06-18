import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionStateService } from './services/transaction-state.service';
import { ReferenceGeneratorService } from './services/reference-generator.service';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionStateService,
    ReferenceGeneratorService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule { }