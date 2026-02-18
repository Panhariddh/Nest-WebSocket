import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

import { UserModel } from '../user.model';
import { MessageType } from 'src/app/common/enum/message.enum';

@Entity('messages')
export class MessageModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserModel, { eager: true })
  sender: UserModel;

  @ManyToOne(() => UserModel, { nullable: true, eager: true })
  receiver?: UserModel;

  @Column('text')
  content: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.PUBLIC,
  })
  type: MessageType;

  @CreateDateColumn()
  createdAt: Date;
}
