import { Injectable } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionStateService {
    private validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
        [TransactionStatus.pending]: [
            TransactionStatus.approved,
            TransactionStatus.rejected,
            TransactionStatus.failed,
        ],
        [TransactionStatus.approved]: [
            TransactionStatus.completed,
            TransactionStatus.failed,
        ],
        [TransactionStatus.rejected]: [],
        [TransactionStatus.failed]: [],
        [TransactionStatus.completed]: [],
    };

    validateTransition(current: TransactionStatus, target: TransactionStatus): boolean {
        const allowed = this.validTransitions[current] || [];
        return allowed.includes(target);
    }

    getErrorMessage(current: TransactionStatus, target: TransactionStatus): string {
        return `Transicion de estado invalida: no se puede cambiar de '${current}' a '${target}'`;
    }
}