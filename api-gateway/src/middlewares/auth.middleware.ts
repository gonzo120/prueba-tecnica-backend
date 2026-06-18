import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'PRUEBA_TECNICA_SECRET_KEY';

export interface AuthRequest extends Request {
    user?: any;
    apiKey?: string;
    merchant?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Caso 1: JWT
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            return res.status(401).json({
                error: 'Token inválido',
                message: 'El JWT proporcionado no es válido o ha expirado',
            });
        }
    }

    // Caso 2: API Key
    if (apiKey) {
        req.apiKey = apiKey;
        return next();
    }

    // Caso 3: Sin autenticación
    return res.status(401).json({
        error: 'No autorizado',
        message: 'Se requiere autenticación mediante JWT (Bearer token) o API Key (x-api-key header)',
    });
};