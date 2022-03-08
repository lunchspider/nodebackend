import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    BaseEntity,
    ManyToMany,
    ManyToOne,
    JoinColumn,
    JoinTable,
} from "typeorm";
import { User } from "./user.entity";

@Entity({
    name: 'games'
})
export class Game extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({
        type: 'timestamp',
        nullable: true
    })
    from_time: Date;

    @Column({
        type: 'timestamp',
        nullable: true
    })
    to_time: Date;

    @Column({
        default: false
    })
    is_confirmed: boolean;

    @Column({
        type: 'timestamp',
        nullable: true
    })
    confirmed_time: Date;

    @Column({
        default: 1,
    })
    num_players: number;

    @Column({
        default: 0,
    })
    num_ready: number;

    @Column({
        nullable : true
    })
    is_dispute : boolean;

    @ManyToOne(() => User, { nullable : true })
    winner: User;


    @ManyToMany(() => User)
    @JoinTable()
    players: User[];

    @Column("int", {array: true})
    votes: number[];
}
