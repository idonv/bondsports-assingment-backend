import Executer from "./executer";
import Transaction from '../models/transaction.model';
import { RunnerFactory } from "./runnerFactory";
import { EntityManager } from "typeorm";
import Account from "../models/account.model";
import { Injectable } from "@nestjs/common";


@Injectable()
export default class TransactionExecuter extends Executer<{ account: Account, transaction: Transaction}, Transaction> {
    constructor(runnerFactory: RunnerFactory) {
        super(runnerFactory);
    }

    protected async execute(data: { account: Account; transaction: Transaction; }, manager: EntityManager): Promise<Transaction> {
        await manager.createQueryBuilder()
        .update(Account)
        .set({ balance: data.account.balance })
        .where('"accountId" = :id', { id: data.account.accountId })
        .execute();

        const transactionEntry = manager.create(Transaction, { ...data.transaction, account: data.account });

        await manager.save([transactionEntry]);

        return transactionEntry;
    }
}