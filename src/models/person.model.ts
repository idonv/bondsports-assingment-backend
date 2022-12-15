import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import Account from "./account.model";

@Entity({ name: 'people' })
export default class Person {

    @PrimaryGeneratedColumn('increment')
    public presonId: number;

    @Column({ nullable: false })
    public name: string;

    @Column({ nullable: false })
    public document: string;

    @Column({ type: 'date' })
    public birthDate: Date = new Date();

    @OneToMany(type => Account, account => account.client)
    public accounts: Account[];
}