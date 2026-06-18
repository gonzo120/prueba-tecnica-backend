import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    try {
        // 1. Crear merchant
        const merchant = await prisma.merchant.upsert({
            where: { email: 'test@merchant.com' },
            update: {},
            create: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                name: 'Test Merchant',
                email: 'test@merchant.com',
                api_key: 'test-api-key-123456',
                status: 'active',
            },
        });

        console.log(`✅ Merchant creado: ${merchant.name}`);

        // 2. Crear transacciones con query raw (evita problemas de tipos)
        const currencies = ['GTQ', 'COP', 'USD'];
        const types = ['payin', 'payout'];
        const statuses = ['pending', 'approved', 'completed'];

        for (let i = 0; i < 10; i++) {
            const reference = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const amount = Math.floor(Math.random() * 1000) + 100;
            const currency = currencies[Math.floor(Math.random() * 3)];
            const type = types[Math.floor(Math.random() * 2)];
            const status = statuses[Math.floor(Math.random() * 3)];

            // Usar query raw para evitar problemas de tipos
            await prisma.$executeRaw`
        INSERT INTO "Transaction" (
          id, merchant_id, amount, currency, type, status, reference, metadata, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 
          ${merchant.id}::uuid,
          ${amount}::decimal,
          ${currency}::"Currency",
          ${type}::"TransactionType",
          ${status}::"TransactionStatus",
          ${reference},
          '{"source": "seed"}'::jsonb,
          NOW(),
          NOW()
        )
      `;
        }

        console.log('✅ 10 transacciones creadas');

        // 3. Obtener transacciones aprobadas para liquidación
        const approvedTransactions = await prisma.$queryRaw`
      SELECT id, amount FROM "Transaction" 
      WHERE merchant_id = ${merchant.id}::uuid 
      AND status = 'approved'::"TransactionStatus"
      LIMIT 3
    `;

        if (approvedTransactions && Array.isArray(approvedTransactions) && approvedTransactions.length > 0) {
            let totalAmount = 0;
            const transactionIds = [];

            for (const row of approvedTransactions) {
                // Convertir amount a número (manejar Decimal de PostgreSQL)
                const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount);
                totalAmount += amount;
                transactionIds.push(row.id);
            }

            // Crear liquidación usando Prisma normal (ya tenemos los IDs)
            const settlement = await prisma.settlement.create({
                data: {
                    merchant_id: merchant.id,
                    total_amount: totalAmount,
                    transaction_count: transactionIds.length,
                    period_start: new Date('2026-03-01'),
                    period_end: new Date('2026-03-27'),
                    status: 'pending',
                },
            });

            // Asociar transacciones a la liquidación
            for (const transactionId of transactionIds) {
                await prisma.settlementTransaction.create({
                    data: {
                        settlement_id: settlement.id,
                        transaction_id: transactionId,
                    },
                });
            }

            console.log(`✅ Liquidación creada: ${settlement.id}`);
        }

        console.log('🎉 Seeding completado!');
    } catch (error) {
        console.error('❌ Error en seeding:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ Error en seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });