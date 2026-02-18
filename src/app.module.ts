import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './app/resources/auth/auth.module';
import { ChatGateway } from './app/resources/chat/chat.gateway';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from './app/config/config.module';
import { UserModel } from './app/database/models/user.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageModel } from './app/database/models/chat/message.model';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([UserModel, MessageModel]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService,ChatGateway],
})
export class AppModule {}
