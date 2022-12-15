import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Account from '../models/account.model';
import Transaction from '../models/transaction.model';
import * as _ from 'lodash';

@Injectable()
export default class AccountRepository {
    constructor(@InjectRepository(Account) private accountRepository: Repository<Account>,
        @InjectRepository(Transaction) private transactionReopsitory: Repository<Transaction>) { }

    getById(accountId: number): Promise<Account> {
        return this.accountRepository.findOne({ where: { accountId } });
    }

    async getSumOfDailyWithdrawls(account: Account): Promise<number> {
        const start = new Date(), end = new Date();
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        const dailyWithdrawalsSum = await this.transactionReopsitory.createQueryBuilder()
            .select('SUM(value) as dailyWithdrawals')
            .where('accountId = :accountId AND value < 0 AND transactionDate BETWEEN :start AND :end', { accountId: account.accountId, start, end })
            .groupBy('accountId')
            .execute()
            .then(results => (_.first(results) as any)?.dailyWithdrawals ?? 0);

        return dailyWithdrawalsSum;
    }

    async getAccountStatement(account: Account, start: Date, end: Date):
        Promise<[{
            transactionId: number,
            value: number,
            transactionDate: Date,
            accountId: number,
            balance: number
        }]> {
        const accountStatement = await this.accountRepository.createQueryBuilder()
            .select(['t1."transactionId"', 't1."value"', 't1."accountId"', 't1."transactionDate"', 'SUM(t2."value") as "balance"'])
            .from('transactions', 't1')
            .leftJoin("transactions", "t2", 't1."accountId" = t2."accountId" and t1."transactionDate" >= t2."transactionDate"')
            .where('t1."accountId" = :accountId AND t1."transactionDate" BETWEEN :start AND :end', { accountId: account.accountId, start, end })
            .groupBy('t1."transactionId", t1."value", t1."transactionDate", t1."accountId"')
            .orderBy('t1."transactionDate"')
            .execute();

        return accountStatement;
    }

    async blockAccount(account: Account): Promise<{ updated: boolean }> {
        const result = await this.accountRepository.createQueryBuilder()
            .update({ activeFlag: false })
            .where({ accountId: account.accountId })
            .execute();

        return { updated: result.affected === 1 };
    }
}