import { Request, Response, NextFunction } from 'express';

enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
    failureThreshold: number;
    timeoutMs: number;
    resetTimeoutMs: number;
}

class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private options: CircuitBreakerOptions;
    private halfOpenRequestAllowed: boolean = false;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            timeoutMs: options.timeoutMs || 10000,
            resetTimeoutMs: options.resetTimeoutMs || 30000,
        };
    }

    public async fire(execution: any): Promise<any> {
        if (this.state === CircuitState.OPEN) {
            const now = Date.now();
            if (now - this.lastFailureTime > this.options.resetTimeoutMs) {
                // Moverse a HALF_OPEN
                this.state = CircuitState.HALF_OPEN;
                this.halfOpenRequestAllowed = true;
                console.log('🔓 Circuit Breaker: HALF_OPEN - Probando si el servicio se recuperó');
            } else {
                throw new Error('Circuit breaker está OPEN');
            }
        }

        try {
            // Ejecutar la función protegida
            const result = await execution();

            // Si llegamos aquí, la ejecución fue exitosa
            if (this.state === CircuitState.HALF_OPEN) {
                // Resetear completamente si la prueba es exitosa
                this.state = CircuitState.CLOSED;
                this.failureCount = 0;
                this.halfOpenRequestAllowed = false;
                console.log('🔒 Circuit Breaker: CLOSED - Servicio recuperado');
            } else if (this.state === CircuitState.CLOSED) {
                // Resetear contador de fallos en éxito
                this.failureCount = 0;
            }

            return result;
        } catch (error) {
            // Manejar fallo
            this.failureCount++;
            this.lastFailureTime = Date.now();

            if (this.state === CircuitState.HALF_OPEN) {
                // Si falla en HALF_OPEN, volver a OPEN
                this.state = CircuitState.OPEN;
                this.halfOpenRequestAllowed = false;
                console.log('🔓 Circuit Breaker: OPEN - La prueba de recuperación falló');
            } else if (this.failureCount >= this.options.failureThreshold) {
                // Abrir el circuito si se supera el umbral
                this.state = CircuitState.OPEN;
                console.log(`🔓 Circuit Breaker: OPEN - ${this.failureCount} fallos consecutivos`);
            }

            throw error;
        }
    }

    public getState(): CircuitState {
        return this.state;
    }

    public reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.halfOpenRequestAllowed = false;
        console.log('🔄 Circuit Breaker: Reset manual');
    }
}

// Crear instancia singleton
export const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    timeoutMs: 10000,
    resetTimeoutMs: 30000,
});

// Middleware wrapper para usar con Express
export const circuitBreakerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const originalNext = next;

    circuitBreaker.fire(async () => {
        // Esta es la función que será protegida por el circuit breaker
        return new Promise((resolve, reject) => {
            // Sobrescribir next para capturar errores
            const wrappedNext = (err?: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(null);
                }
            };

            // Llamar al siguiente middleware
            originalNext(wrappedNext);
        });
    }).catch((error) => {
        // Si el circuit breaker está abierto, retornar error 503
        res.status(503).json({
            error: 'Servicio no disponible',
            message: 'El servicio de pagos está temporalmente no disponible (Circuit Breaker activado)',
            retry_after: 30,
        });
    });
};