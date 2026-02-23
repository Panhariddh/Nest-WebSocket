import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "../services/jwt.strategy";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PassportModule } from "@nestjs/passport";
import { Module } from "@nestjs/common";
import jwtConstants from "src/app/utils/jwt.constants";
import { UserModel } from "src/app/database/models/user.model";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageModel } from "src/app/database/models/chat/message.model";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserModel, MessageModel]),
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.access.secret,
      signOptions: { expiresIn: jwtConstants.access.expiresIn },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
