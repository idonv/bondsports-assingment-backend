import { Injectable, LoggerService, Inject } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { RunnerFactory } from "./runnerFactory";
import Account from '../models/account.model';
import Person from "../models/person.model";
import Executer from "./executer";

@Injectable()
export default class AccountCreationExecuter extends Executer<{ account: Account, client: Person }, Account> {
    constructor(runnerFactory: RunnerFactory, @Inject('Logger') private logger: LoggerService) {
        super(runnerFactory);
    }

    protected async execute(data: { account: Account, client: Person }, manager: EntityManager): Promise<Account> {
        let client = await manager.findOne(Person, { where: { document: data.client.document } });

        if (!client) {
            client = manager.create(Person, data.client);
            this.logger.log(`Created a new client with ${JSON.stringify({ id: client.presonId, name: client.name, document: client.document, birthDate: client.birthDate })}`);
            await manager.save([client]);
        }

        const accountEntry = manager.create(Account, { ...data.account, client });

        await manager.save([accountEntry])

        return accountEntry;
    }
}