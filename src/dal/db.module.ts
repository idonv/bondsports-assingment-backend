import { Module } from '@nestjs/common';
import { RunnerFactory } from './runnerFactory';
import { TypeOrmModule } from '@nestjs/typeorm';
import Person from '../models/person.model';
import Account from '../models/account.model';
import Transaction from '../models/transaction.model';
import { LoggerModule } from '../logger/logger.module';
import AccountCreationExecuter from './accountCreation.executer';
import TransactionExecuter from './transaction.executer';
import AccountRepository from './account.repository';

@Module({
  imports: [TypeOrmModule.forRoot({
      type: 'sqlite',
      database: './db/db.sqlite',
      // host: 'localhost',
      // port: 5432,
      // username: 'admin',
      // password: 'admin',
      entities: [Person, Account, Transaction],
      synchronize: true
  }), LoggerModule, TypeOrmModule.forFeature([Transaction]), TypeOrmModule.forFeature([Account])],
  providers: [RunnerFactory, TransactionExecuter, AccountCreationExecuter, AccountRepository],
  exports: [AccountCreationExecuter, TransactionExecuter, AccountRepository]
})
export class DbModule {}
