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
import { Repository } from 'typeorm';

import { UserModel } from 'src/app/database/models/user.model';
import jwtConstants from 'src/app/utils/jwt.constants';

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

  constructor(
    private jwtService: JwtService,
    @InjectRepository(UserModel)
    private userRepo: Repository<UserModel>,
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

      console.log(`✅ WS Connected: ${user.name} (${user.email})`);
    } catch (err) {
      console.log('❌ WS Authentication failed');
      client.disconnect();
    }
  }

  // ==============================
  // DISCONNECT
  // ==============================
  handleDisconnect(client: Socket) {
    if (client.data?.user) {
      console.log(`🔴 WS Disconnected: ${client.data.user.name}`);
    }
  }

  // ==============================
  // PUBLIC MESSAGE (broadcast)
  // ==============================
  @SubscribeMessage('public-message')
  handlePublicMessage(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    if (!user) return;

    this.server.emit('public-message', {
      from: user.name,
      message,
      time: new Date(),
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

    if (!sender) return;

    const targetUser = await this.userRepo.findOne({
      where: { id: data.targetUserId },
    });

    if (!targetUser) {
      client.emit('error', 'Target user not found');
      return;
    }

    this.server.to(`user-${targetUser.id}`).emit('private-message', {
      from: sender.name,
      message: data.message,
      time: new Date(),
    });
  }
}
