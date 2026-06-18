import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { authMiddleware } from './middlewares/auth.middleware';
import { loggingMiddleware } from './middlewares/logging.middleware';
import { rateLimiterMiddleware } from './middlewares/rate-limiter.middleware';
import { circuitBreaker } from './services/circuit-breaker.service';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3001';

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);
app.use(rateLimiterMiddleware);

// Health check del gateway
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Health check agregador
app.get('/api/v1/health', async (req: Request, res: Response) => {
    try {
        const paymentResponse = await fetch(`${PAYMENT_SERVICE_URL}/health`);
        const paymentHealth = await paymentResponse.json() as any;

        const allHealthy = paymentHealth?.status === 'ok';

        res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                'api-gateway': { status: 'ok' },
                'payment-service': paymentHealth,
            },
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Error al verificar servicios',
        });
    }
});

// AUTH: Requiere autenticación
app.use('/api/v1', authMiddleware);

// Proxy con Circuit Breaker
const proxyMiddleware = createProxyMiddleware({
    target: PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/v1': '/',
    },
});

// Wrapper para Circuit Breaker
const proxyWithCircuitBreaker = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await circuitBreaker.fire(() => {
            return new Promise((resolve, reject) => {
                proxyMiddleware(req, res, (err: any) => {
                    if (err) reject(err);
                    else resolve(null);
                });
            });
        });
    } catch (error) {
        res.status(503).json({
            error: 'Servicio no disponible',
            message: 'Circuit breaker activado - Servicio temporalmente no disponible',
            retry_after: 30,
        });
    }
};

// Rutas protegidas
app.use('/api/v1/transactions', proxyWithCircuitBreaker);
app.use('/api/v1/settlements', proxyWithCircuitBreaker);

// Manejo de errores global
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error global:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 API Gateway running on port ${PORT}`);
    console.log(`📡 Proxying to payment-service at ${PAYMENT_SERVICE_URL}`);
});