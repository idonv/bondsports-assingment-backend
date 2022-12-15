import { EntityManager, QueryRunner } from 'typeorm';
import { RunnerFactory } from './runnerFactory';

export default abstract class Executer<TInput, TOutput> {
    constructor(private runnerFactory: RunnerFactory) {}

    protected abstract execute(data: TInput, manager: EntityManager): Promise<TOutput>;

    async run(data: TInput) {
        let runner: QueryRunner;
        try {
            runner = await this.runnerFactory.create();
            await runner.startTransaction();

            const result = await this.execute(data, runner.manager);

            await runner.commitTransaction();

            return result;
        } catch (error) {
            runner?.isTransactionActive && await runner?.rollbackTransaction();
            throw error;

        } finally {
            runner.isTransactionActive && await runner?.release();
        }
    }
}