import { JwtService } from "@nestjs/jwt";
import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";

import { Server, Socket } from "socket.io";
import jwtConstants from "src/app/utils/jwt.constants";

@WebSocketGateway({
    cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;

      if (!token) throw new Error();

      const decoded = this.jwtService.verify(token, {
        secret: jwtConstants.secret,
      });

      client.data.user = decoded;

      console.log('WS Authenticated:', decoded);
    } catch (err) {
      console.log('WS Authentication failed');
      client.disconnect();
    }
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    this.server.emit('message', `${user.role}: ${message}`);
  }
}
