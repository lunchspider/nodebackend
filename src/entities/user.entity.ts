
import { Entity , PrimaryGeneratedColumn, Column, BaseEntity} from 'typeorm';

@Entity({
    name: 'users'
})
export class User extends BaseEntity{
    @PrimaryGeneratedColumn("uuid")
    id : string;

    @Column()
    username: string;

    @Column({
        default: 0,
    })
    penaltyPoints : Number;

}


