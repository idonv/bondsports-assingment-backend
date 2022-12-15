import { Module } from '@nestjs/common';
import { DbModule } from '../dal/db.module';
import { LoggerModule } from '../logger/logger.module';
import { AccountsController } from './accounts.controller';
import {AccountsService} from './accounts.service';

@Module({
  imports: [LoggerModule, DbModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: []
})
export class AccountsModule {}
