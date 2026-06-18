import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

class RateLimiter {
    private store = new Map<string, RateLimitRecord>();
    private windowMs: number;
    private maxRequests: number;

    constructor(windowMs: number = 60000, maxRequests: number = 100) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;

        // Limpiar entradas expiradas cada minuto
        setInterval(() => this.cleanup(), 60000);
    }

    private getKey(req: Request): string {
        const apiKey = req.headers['x-api-key'] as string;
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        return apiKey ? `apikey:${apiKey}` : `ip:${ip}`;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (now > record.resetTime) {
                this.store.delete(key);
            }
        }
    }

    public check(req: Request, res: Response, next: NextFunction): boolean {
        const key = this.getKey(req);
        const now = Date.now();
        const record = this.store.get(key) || { count: 0, resetTime: now + this.windowMs };

        // Resetear si ha pasado la ventana
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + this.windowMs;
        }

        record.count++;
        this.store.set(key, record);

        const remaining = Math.max(0, this.maxRequests - record.count);

        // Agregar headers de rate limit
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

        if (record.count > this.maxRequests) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            res.status(429).json({
                error: 'Too Many Requests',
                message: `Límite de ${this.maxRequests} requests por minuto excedido. Intenta de nuevo en ${retryAfter} segundos.`,
                retry_after: retryAfter,
            });
            return false;
        }

        return true;
    }
}

// Singleton
const rateLimiter = new RateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
);

export const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (rateLimiter.check(req, res, next)) {
        next();
    }
};