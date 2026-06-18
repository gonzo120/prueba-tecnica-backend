import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class SettlementsService {
    constructor(
        private prisma: PrismaService,
        private transactionsService: TransactionsService,
    ) { }

    async generate(dto: GenerateSettlementDto) {
        const { merchant_id, period_start, period_end } = dto;
        const startDate = new Date(period_start);
        const endDate = new Date(period_end);

        // Verificar que el merchant existe y está activo
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchant_id, status: 'active' },
        });

        if (!merchant) {
            throw new NotFoundException('Merchant no encontrado o inactivo');
        }

        // Buscar transacciones elegibles
        const transactions = await this.transactionsService.findApprovedForSettlement(
            merchant_id,
            startDate,
            endDate,
        );

        if (transactions.length === 0) {
            throw new NotFoundException(
                'No hay transacciones elegibles para liquidación en el período especificado'
            );
        }

        // Verificar que las transacciones no están ya en otra liquidación
        const transactionIds = transactions.map(t => t.id);
        const existingSettlements = await this.prisma.settlementTransaction.findMany({
            where: {
                transaction_id: {
                    in: transactionIds,
                },
            },
        });

        if (existingSettlements.length > 0) {
            throw new ConflictException(
                'Algunas transacciones ya pertenecen a otra liquidación'
            );
        }

        // Usar transacción de base de datos para crear la liquidación
        return this.prisma.$transaction(async (tx) => {
            // ✅ CORREGIDO: Convertir Decimal a Number
            const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

            // Crear la liquidación
            const settlement = await tx.settlement.create({
                data: {
                    merchant_id,
                    total_amount: totalAmount,
                    transaction_count: transactions.length,
                    period_start: startDate,
                    period_end: endDate,
                    status: 'pending',
                },
            });

            // Asociar las transacciones
            await tx.settlementTransaction.createMany({
                data: transactions.map(t => ({
                    settlement_id: settlement.id,
                    transaction_id: t.id,
                })),
            });

            return settlement;
        });
    }

    async findOne(id: string, merchantId: string) {
        const settlement = await this.prisma.settlement.findFirst({
            where: {
                id,
                merchant_id: merchantId,
            },
            include: {
                merchant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                transactions: {
                    include: {
                        transaction: true,
                    },
                },
            },
        });

        if (!settlement) {
            throw new NotFoundException('Liquidación no encontrada');
        }

        return settlement;
    }
}