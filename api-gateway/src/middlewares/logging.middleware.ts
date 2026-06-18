import { Request, Response, NextFunction } from 'express';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Capturar la respuesta original
    const originalSend = res.send;
    res.send = function (body: any): Response {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${statusCode} ${duration}ms`;

        // Log en consola
        console.log(log);

        // También podríamos guardar en un archivo o base de datos
        // fs.appendFileSync('logs/access.log', log + '\n');

        return originalSend.call(this, body);
    };

    next();
};