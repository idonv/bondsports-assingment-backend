import { ConsoleLogger, Inject, Injectable, LoggerService } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class RunnerFactory {
    constructor(@Inject('Logger') private logger: LoggerService, private dataSource: DataSource) {

    }

    async create() {
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();

        return runner;
    }
}