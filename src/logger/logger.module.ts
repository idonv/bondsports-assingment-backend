import { ConsoleLogger, Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [{ provide: 'Logger', useClass: ConsoleLogger }],
  exports: [{ provide: 'Logger', useClass: ConsoleLogger }]
})
export class LoggerModule {}
