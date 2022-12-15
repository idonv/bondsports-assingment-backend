import { ConsoleLogger, Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { DbModule } from './dal/db.module';

@Module({
  imports: [AccountsModule, DbModule],
  providers: [{ provide: 'Logger', useClass: ConsoleLogger }],
  exports: [{ provide: 'Logger', useClass: ConsoleLogger }]
})
export class AppModule {}
