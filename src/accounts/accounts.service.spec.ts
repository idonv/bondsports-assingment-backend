import { ConsoleLogger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Transaction from '../models/transaction.model';
import AccountRepository from '../dal/account.repository';
import AccountCreationExecuter from '../dal/accountCreation.executer';
import TransactionExecuter from '../dal/transaction.executer';
import Account, { AccountType } from '../models/account.model';
import { AccountsService } from './accounts.service'
import { BlockedAccountException, ValidationException } from '../exceptions/exceptions';

describe('AccountsService Tests', () => {
    let service: AccountsService;
    let app: TestingModule;
    beforeEach(async () => {
        app = await Test.createTestingModule({
            providers: [AccountsService, { provide: 'Logger', useClass: ConsoleLogger }]
        })
            .useMocker((token) => {
                switch (token) {
                    case TransactionExecuter:
                        return { run: () => Promise.resolve(new Transaction()) }
                    case AccountCreationExecuter:
                        return { run: () => Promise.resolve(new Account()) }
                    case AccountRepository:
                        return {
                            getById: (accountId: number) => Promise.resolve(),
                            getSumOfDailyWithdrawls: (account: Account) => Promise.resolve(),
                            getAccountStatement: (data: { account: Account, start: Date, end: Date }) => Promise.resolve(),
                            blockAccount: (accountId: number) => Promise
                        }
                    default:
                        return {};
                }
            })
            .compile();

        service = app.get(AccountsService);
    })

    describe('createAccount Tests', () => {
        it('should create a new acount', () => {
            const params = {
                clientName: 'test',
                clientDocument: 'test',
                clientBirthDate: new Date(),
                accountType: AccountType.Executive,
                dailyWithdrawalLimit: null
            }

            expect(service.createAccount(params)).resolves.toBeInstanceOf(Account);
        });

        it('should throw an error', () => {
            const params = {
                clientName: 'test',
                clientDocument: 'test',
                clientBirthDate: new Date(),
                accountType: AccountType.Executive,
                dailyWithdrawalLimit: null
            }

            const accountCreationExecutor = app.get(AccountCreationExecuter);
            accountCreationExecutor.run = jest.fn(() => {
                return Promise.reject(new Error('Unexpected error'))
            });

            expect(service.createAccount(params)).rejects.toThrow();
        });
    });

    describe('blockAccount Tests', () => {
        it('should block an account', () => {
            const accountRepository = app.get(AccountRepository);
            const account =  new Account();
            account.accountId = 1;

            accountRepository.getById = jest.fn().mockResolvedValue(account);
            accountRepository.blockAccount = jest.fn().mockResolvedValue({ updated: true });

            expect(service.blockAccount(account.accountId)).resolves.toMatchObject({ updated: true })
        })

        it('should not block an already blocked account', () => {
            const accountRepository = app.get(AccountRepository);
            const account =  new Account();
            account.accountId = 1;
            account.activeFlag = false;
            accountRepository.getById = jest.fn().mockResolvedValue(account);

            expect(service.blockAccount(account.accountId)).rejects.toThrow(BlockedAccountException);
        })
    })

    describe('accountStatement Tests', () => {
        it('should return an account statement', () => {
            const accountRepository = app.get(AccountRepository);
            const account =  new Account();
            account.accountId = 1;

            const transactions = [
                { transactionId: 1, value: 200, balance: 200, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: 1000, balance: 1200, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: -500, balance: 700, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: 300, balance: 1000, tranactionDate: new Date('2022-12-13'), account: account },
                { transactionId: 1, value: -100, balance: 900, tranactionDate: new Date('2022-12-14'), account: account }
            ]

            accountRepository.getAccountStatement = jest.fn().mockResolvedValue(transactions);

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.accountStatement(account.accountId, new Date('2022-12-12'), new Date('2022-12-14'))).resolves.toEqual(transactions);
        })

        it('should throw an error when account is blocked', () => {
            const accountRepository = app.get(AccountRepository);
            const account =  new Account();
            account.accountId = 1;
            account.activeFlag = false;

            const transactions = [
                { transactionId: 1, value: 200, balance: 200, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: 1000, balance: 1200, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: -500, balance: 700, tranactionDate: new Date('2022-12-12'), account: account },
                { transactionId: 1, value: 300, balance: 1000, tranactionDate: new Date('2022-12-13'), account: account },
                { transactionId: 1, value: -100, balance: 900, tranactionDate: new Date('2022-12-14'), account: account }
            ]

            accountRepository.getAccountStatement = jest.fn().mockResolvedValue(transactions);

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.accountStatement(account.accountId, new Date('2022-12-12'), new Date('2022-12-14'))).rejects.toThrow(BlockedAccountException);
        })
    })

    describe('Deposit Tests', () => {
        it('should create a new deposit tranasction', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.deposit(account.accountId, 1000)).resolves.toBeInstanceOf(Transaction);
        })

        it('should throw an error on a blocked account', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;
            account.activeFlag = false;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.deposit(account.accountId, 1000)).rejects.toThrow(BlockedAccountException);
        })

        it('should throw an error on an invalid transaction', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.deposit(account.accountId, -1000)).rejects.toThrow(ValidationException);
        })
    });

    describe('Withdraw Tests', () => {
        it('should create a new withdrawal tranasction', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.withdraw(account.accountId, -1000)).resolves.toBeInstanceOf(Transaction);
        })

        it('should throw an error on a blocked account', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;
            account.activeFlag = false;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.withdraw(account.accountId, 1000)).rejects.toThrow(BlockedAccountException);
        })

        it('should throw an error on when account dailyWithdrawalLimit has passed', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;
            account.dailyWithdrawlLimit = 200;
            account.balance = 1_000_000

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getSumOfDailyWithdrawls = jest.fn().mockResolvedValue(account.dailyWithdrawlLimit);

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.deposit(account.accountId, -1000)).rejects.toThrow(ValidationException);
        })

        it('should throw an error on when account balance is less than the withdrawal', () => {
            const accountRepository = app.get(AccountRepository);
            const transactionExecutor = app.get(TransactionExecuter);
            const account =  new Account();
            account.accountId = 1;
            account.dailyWithdrawlLimit = 200;
            account.balance = 900;

            transactionExecutor.run = jest.fn(({ transaction, account }) => {
                return Promise.resolve(transaction);
            });

            accountRepository.getSumOfDailyWithdrawls = jest.fn().mockResolvedValue(account.dailyWithdrawlLimit);

            accountRepository.getById = jest.fn().mockResolvedValue(account); 

            expect(service.deposit(account.accountId, -1000)).rejects.toThrow(ValidationException);
        })
    });
})