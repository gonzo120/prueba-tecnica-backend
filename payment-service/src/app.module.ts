
import { Module } from '@nestjs/common';
import { TransactionsModule } from './transactions/transactions.module';
import { SettlementsModule } from './settlements/settlements.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        TransactionsModule,
        SettlementsModule,
        HealthModule,
    ],
})
export class AppModule { }