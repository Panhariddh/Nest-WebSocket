import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { In, Repository } from 'typeorm';

import { UserModel } from 'src/app/database/models/user.model';
import jwtConstants from 'src/app/utils/jwt.constants';
import { MessageModel } from 'src/app/database/models/chat/message.model';
import { MessageType } from 'src/app/common/enum/message.enum';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserModel)
    private userRepo: Repository<UserModel>,
    @InjectRepository(MessageModel)
    private messageRepo: Repository<MessageModel>,
  ) {}

  // ==============================
  // CONNECTION
  // ==============================
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;

      if (!token) throw new Error('No token provided');

      // 1️.Verify JWT
      const decoded = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
      });

      // 2️.Load real user from database
      const user = await this.userRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!user) throw new Error('User not found');

      // 3️.Attach full user to socket
      client.data.user = user;

      // 4️.Join private room
      client.join(`user-${user.id}`);

      client.emit('me', {
        id: user.id,
        name: user.name,
      });

      // 5.Track online user
      this.onlineUsers.set(user.id, client.id);

      const users = await this.userRepo.find({
        where: {
          id: In(Array.from(this.onlineUsers.keys())),
        },
      });

      this.server.sockets.sockets.forEach((socket) => {
        const currentUser = socket.data?.user;

        if (!currentUser) return;

        const filtered = users.filter(
          (u) => u.id !== currentUser.id,
        );

        socket.emit('online-users', filtered);
      });


      console.log(`✅ WS Connected: ${user.name} (${user.email})`);
    } catch (err) {
      console.log('❌ WS Authentication failed');
      client.disconnect();
    }
  }

  // ==============================
  // DISCONNECT
  // ==============================
  async handleDisconnect(client: Socket) {
    const user = client.data?.user;

    if (!user) return;

    this.onlineUsers.delete(user.id);

    const users = await this.userRepo.find({
      where: {
        id: In(Array.from(this.onlineUsers.keys())),
      },
    });

    this.server.sockets.sockets.forEach((socket) => {
      const currentUser = socket.data?.user;

      if (!currentUser) return;

      const filtered = users.filter(
        (u) => u.id !== currentUser.id,
      );

      socket.emit('online-users', filtered);
    });


    console.log(`🔴 WS Disconnected: ${user.name}`);
  }

  // ==============================
  // PUBLIC MESSAGE (broadcast)
  // ==============================
  @SubscribeMessage('public-message')
  async handlePublicMessage(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    if (!user) return;

     const saved = await this.messageRepo.save({
        sender: user,
        content: message,
        type: MessageType.PUBLIC,
      });

      this.server.emit('public-message', {
        id: saved.id,
        senderId: user.id,
        from: user.name,
        message: saved.content,
        time: saved.createdAt,
      });
  }

  // ==============================
  // PRIVATE MESSAGE
  // ==============================
  @SubscribeMessage('private-message')
  async handlePrivateMessage(
    @MessageBody()
    data: { targetUserId: number; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = client.data.user;

    const target = await this.userRepo.findOne({
      where: { id: data.targetUserId },
    });

    if (!target) return;

    const saved = await this.messageRepo.save({
      sender,
      receiver: target,
      content: data.message,
      type: MessageType.PRIVATE,
      isRead: false,
    });

    const payload = {
      id: saved.id,
      senderId: sender.id,
      from: sender.name,
      message: saved.content,
      time: saved.createdAt,
    };

    // send to receiver
    this.server.to(`user-${target.id}`).emit(
      'private-message',
      payload,
    );

    // send back to sender too
    this.server.to(`user-${sender.id}`).emit(
      'private-message',
      payload,
    );
    // Notify sender that message is delivered
    this.server.to(`user-${sender.id}`).emit(
      'message-delivered',
      saved.id,
    );
  }

  @SubscribeMessage('load-messages')
  async loadMessages(@ConnectedSocket() client: Socket) {
    const messages = await this.messageRepo.find({
      where: { type: MessageType.PUBLIC },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    client.emit(
      'load-messages',
      messages.map(m => ({
        id: m.id,
        senderId: m.sender.id,
        from: m.sender.name,
        message: m.content,
        time: m.createdAt,
      })),
    );
  }

  @SubscribeMessage('load-private-messages')
  async loadPrivateMessages(
    @MessageBody() targetUserId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    const messages = await this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .leftJoinAndSelect('m.receiver', 'receiver')
      .where(
        '(m.senderId = :u1 AND m.receiverId = :u2) OR (m.senderId = :u2 AND m.receiverId = :u1)',
        { u1: user.id, u2: targetUserId },
      )
      .orderBy('m.createdAt', 'ASC')
      .getMany();

    client.emit(
      'private-history',
      messages.map(m => ({
        id: m.id,
        senderId: m.sender.id,
        from: m.sender.name,
        message: m.content,
        time: m.createdAt,
      })),
    );

    // mark messages as read
    await this.messageRepo
      .createQueryBuilder()
      .update(MessageModel)
      .set({ isRead: true })
      .where('receiverId = :me', { me: user.id })
      .andWhere('senderId = :other', { other: targetUserId })
      .execute();

    // notify sender
    this.server.to(`user-${targetUserId}`).emit(
      'message-read',
      user.id,
    );
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() targetUserId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    this.server.to(`user-${targetUserId}`).emit('typing', user.name);
  }


}
