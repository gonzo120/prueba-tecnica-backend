import {
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionStateService } from './services/transaction-state.service';
import { ReferenceGeneratorService } from './services/reference-generator.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private stateService: TransactionStateService,
        private referenceGenerator: ReferenceGeneratorService,
    ) { }

    async create(dto: CreateTransactionDto) {
        // Verificar que el merchant existe y está activo
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: dto.merchant_id, status: 'active' },
        });

        if (!merchant) {
            throw new NotFoundException('Merchant no encontrado o inactivo');
        }

        // Generar referencia única
        const reference = await this.referenceGenerator.generateUnique(
            async (ref) => {
                const exists = await this.prisma.transaction.findUnique({
                    where: { reference: ref },
                });
                return !!exists;
            }
        );

        // Crear transacción
        return this.prisma.transaction.create({
            data: {
                ...dto,
                reference,
                amount: dto.amount,
                status: 'pending',
            },
        });
    }

    async updateStatus(id: string, status: TransactionStatus, merchantId: string) {
        // Verificar que la transacción existe y pertenece al merchant
        const transaction = await this.prisma.transaction.findFirst({
            where: {
                id,
                merchant_id: merchantId,
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transacción no encontrada');
        }

        // Validar transición de estado
        if (!this.stateService.validateTransition(transaction.status, status)) {
            throw new UnprocessableEntityException(
                this.stateService.getErrorMessage(transaction.status, status)
            );
        }

        // Actualizar estado
        return this.prisma.transaction.update({
            where: { id },
            data: { status },
        });
    }

    async findAll(params: {
        merchant_id: string;
        page?: number;
        limit?: number;
        status?: string;
        type?: string;
        date_from?: string;
        date_to?: string;
    }) {
        const { merchant_id, page = 1, limit = 20, status, type, date_from, date_to } = params;
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const where: any = {
            merchant_id,
        };

        if (status) where.status = status;
        if (type) where.type = type;
        if (date_from || date_to) {
            where.created_at = {};
            if (date_from) where.created_at.gte = new Date(date_from);
            if (date_to) where.created_at.lte = new Date(date_to);
        }

        const [data, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                skip,
                take,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit: take,
                total_pages: Math.ceil(total / take),
            },
        };
    }

    async findOne(id: string, merchantId: string) {
        const transaction = await this.prisma.transaction.findFirst({
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
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transacción no encontrada');
        }

        return transaction;
    }

    async findApprovedForSettlement(
        merchantId: string,
        periodStart: Date,
        periodEnd: Date,
    ) {
        return this.prisma.transaction.findMany({
            where: {
                merchant_id: merchantId,
                status: 'approved',
                created_at: {
                    gte: periodStart,
                    lte: periodEnd,
                },
                settlement_transactions: null, // No liquidada aún
            },
        });
    }
}