import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserModel } from 'src/app/database/models/user.model';
import * as bcrypt from 'bcrypt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConstants from 'src/app/utils/jwt.constants';
interface JwtPayload {
  userId: number;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserModel)
    private userRepo: Repository<UserModel>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) throw new UnauthorizedException();

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role as string,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConstants.access.secret as string,
      expiresIn: jwtConstants.access.expiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConstants.refresh.secret,
      expiresIn: jwtConstants.refresh.expiresIn,
    });

    // hash refresh token before saving
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userRepo.update(user.id, {
      refreshToken: hashedRefreshToken,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtConstants.refresh.secret,
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.userId },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      // compare hashed token
      const isMatch = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isMatch) throw new UnauthorizedException();

      const newAccessToken = this.jwtService.sign(
        {
          userId: user.id,
          role: user.role as string,
        },
        {
          secret: jwtConstants.access.secret,
          expiresIn: jwtConstants.access.expiresIn,
        },
      );

      return {
        access_token: newAccessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  
  async logout(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (user) {
      user.refreshToken = null;
      await this.userRepo.save(user);
    }

    return { message: 'Logged out successfully' };
  }
}
