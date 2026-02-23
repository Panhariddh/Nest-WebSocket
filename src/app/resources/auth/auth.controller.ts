import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../guards/jwt-guard";
import { InjectRepository } from "@nestjs/typeorm";
import { UserModel } from "src/app/database/models/user.model";
import { Repository } from "typeorm";

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(UserModel)
    private userRepo: Repository<UserModel>,
  ) {}

  @Post('login')
  login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check')
  check(@Req() req) {
    return req.user;
  }

  async logout(userId: number) {
    await this.userRepo.update(userId, {
      refreshToken: null,
    });

    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
}
