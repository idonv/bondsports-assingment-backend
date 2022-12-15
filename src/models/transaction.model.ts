import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import Account from "./account.model";

@Entity({name: 'transactions'})
export default class Transaction {

    @PrimaryGeneratedColumn('increment')
    public transactionId: number;

    @ManyToOne(type => Account, account => account.transactions, { lazy: true  })
    @JoinColumn({ name: 'accountId' })
    public account: Account;

    @Column({ type: 'decimal', nullable: true })
    public value: number;

    @Column({ type: 'datetime'})
    public transactionDate: Date  = new Date();
}