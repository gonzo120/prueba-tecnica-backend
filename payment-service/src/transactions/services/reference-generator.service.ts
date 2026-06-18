import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ReferenceGeneratorService {
    private readonly PREFIX = 'TXN';

    generate(): string {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();

        return `${this.PREFIX}-${yyyy}${mm}${dd}-${random}`;
    }

    async generateUnique(checkExists: (ref: string) => Promise<boolean>): Promise<string> {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            const reference = this.generate();
            const exists = await checkExists(reference);
            if (!exists) {
                return reference;
            }
            attempts++;
        }

        throw new Error('No se pudo generar una referencia única después de múltiples intentos');
    }
}