import { Inject, Injectable, LoggerService } from "@nestjs/common";
import Account, { AccountType } from "../models/account.model";
import Person from "../models/person.model";
import Transaction from "../models/transaction.model";
import { ValidationException, BlockedAccountException, InvalidAccountException } from '../exceptions/exceptions';
import AccountCreationExecuter from "../dal/accountCreation.executer";
import TransactionExecuter from "../dal/transaction.executer";
import AccountRepository from '../dal/account.repository';
import * as _ from 'lodash';

type AccountCreation = {
    accountType: AccountType,
    dailyWithdrawalLimit: number,
    balance?: number,
    clientName: string,
    clientDocument: string,
    clientBirthDate: Date
}

@Injectable()
export class AccountsService {
    constructor(@Inject('Logger') private logger: LoggerService,
        private accountCreationExecutor: AccountCreationExecuter,
        private transactionExecutor: TransactionExecuter,
        private accountQuery: AccountRepository) { }

    async createAccount(accountCreationParams: AccountCreation): Promise<Account> {
        try {

            const account = new Account();
            account.createDate = new Date();
            account.accountType = accountCreationParams.accountType;
            account.dailyWithdrawlLimit = accountCreationParams.dailyWithdrawalLimit;

            const client = new Person();
            client.document = accountCreationParams.clientDocument;
            client.name = accountCreationParams.clientName;
            client.birthDate = accountCreationParams.clientBirthDate;

            const accountEntity = await this.accountCreationExecutor.run({ account, client });

            this.logger.log(`New account created successfuly, account id: ${accountEntity.accountId}`);

            return accountEntity;

        } catch (error) {
            this.logger.error(`Error in AccountsService createAccount - ${error.message}`);
            throw error;
        }
    }

    async blockAccount(accountId: number): Promise<{ updated: boolean }> {
        const account = await this.getAccountById(accountId);

        const result = await this.accountQuery.blockAccount(account);

        result.updated && this.logger.log(`Blocked account with id: ${account.accountId}`);

        return result;
    }

    async accountStatement(accountId: number, start: Date, end: Date) {
        try {

            const account = await this.getAccountById(accountId);

            const accountStatement = await this.accountQuery.getAccountStatement(account, start, end);

            return accountStatement;

        } catch (error) {
            if (!(error instanceof ValidationException)) {
                this.logger.error(`Error in AccountsService accountStatment - ${error.message}`);
            }

            throw error;
        }
    }

    async getAccountById(accountId: number): Promise<Account> {
        const account = await this.accountQuery.getById(accountId);

        this.validateAccountStatus(account);

        return account;
    }


    async deposit(accountId: number, value: number): Promise<Transaction> {
        if(value < 0) {
            throw new ValidationException(`Deposit transaction can not be negative`);
        }
        
        const account = await this.getAccountById(accountId);

        const transaction = new Transaction();
        transaction.value = value;
        transaction.account = account;

        this.validaTransaction(transaction, account);

        account.balance += transaction.value;

        const transactionEntity = await this.transactionExecutor.run({ transaction, account });

        this.logger.log(`New deposit transaction for account id: ${accountId}, the withdrawal amount: ${transactionEntity.value}`);

        return transactionEntity;
    }

    async withdraw(accountId: number, value: number): Promise<Transaction> {
        value = value < 0 ? value : -value;

        const account = await this.getAccountById(accountId);

        const transaction = new Transaction();
        transaction.value = value;
        transaction.account = account;

        this.validaTransaction(transaction, account);

        const start = new Date(), end = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        const dailyWithdrawals = await this.accountQuery.getSumOfDailyWithdrawls(account);

        if (account.dailyWithdrawlLimit != null && Math.abs(dailyWithdrawals) + Math.abs(transaction.value) >= account.dailyWithdrawlLimit) {
            const aviableWithdrawalAmount = account.dailyWithdrawlLimit - Math.abs(dailyWithdrawals);
            throw new ValidationException(`The withdrawal request surpasses the account's daily withdrawal limit. The avaible withdrawal amount is ${aviableWithdrawalAmount}`);
        }

        account.balance -= value;

        const transactionEntity = await this.transactionExecutor.run({ transaction, account });

        this.logger.log(`New withdrawal transaction for account id: ${accountId}, the withdrawal amount: ${transactionEntity.value}`);

        return transactionEntity;

    }

    private validateAccountStatus(account: Account) {
        if (!account) {
            throw new InvalidAccountException('Invalid Account!');
        }

        if (!account.activeFlag) {
            throw new BlockedAccountException(`Account with id: ${account.accountId} is blocked`);
        }
    }

    private validaTransaction(transaction: Transaction, account: Account) {

        if (!transaction.value) {
            throw new ValidationException(`Invalid transaction value, must be less or more than 0, not equal to`);
        }

        if (transaction.value < 0 && account.balance < Math.abs(transaction.value)) {
            throw new ValidationException(`Account has less balance then ${transaction.value}`);
        }
    }
}