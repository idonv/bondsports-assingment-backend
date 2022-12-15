import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import Preson from "./person.model";
import Transaction from "./transaction.model";

export enum AccountType {
    Simple,
    Executive
}

@Entity({ name: 'accounts' })
export default class Account {

    @PrimaryGeneratedColumn('increment')
    public accountId: number;

    @ManyToOne(type => Preson, preson => preson.accounts, { nullable: false })
    @JoinColumn({ name: 'clientId' })
    public client: Preson;

    @Column({ default: 0, type: 'decimal' })
    public balance: number;

    @Column({ type: 'int', enum: AccountType, default: AccountType.Simple })
    public accountType: AccountType;

    @Column({ type: 'decimal', nullable: true })
    public dailyWithdrawlLimit: number;

    @Column({ default: true })
    public activeFlag: boolean = true;

    @Column({ type: 'datetime' })
    public createDate: Date = new Date();

    @OneToMany(type => Transaction, tranaction => tranaction.account)
    public transactions: Transaction[]
}