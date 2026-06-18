import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async check() {
        const startTime = process.uptime();

        try {
            // Verificar conexión a base de datos
            await this.prisma.$queryRaw`SELECT 1`;
            const databaseStatus = 'connected';
        } catch (error) {
            return {
                status: 'error',
                service: 'payment-service',
                uptime: Math.floor(startTime),
                database: 'disconnected',
                timestamp: new Date().toISOString(),
                error: error.message,
            };
        }

        return {
            status: 'ok',
            service: 'payment-service',
            uptime: Math.floor(startTime),
            database: 'connected',
            timestamp: new Date().toISOString(),
        };
    }
}