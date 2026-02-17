import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, password: string) {
    // Fake validation for demo
    if (email !== 'test@test.com' || password !== '1234') {
      throw new UnauthorizedException();
    }

    const payload = { userId: 1, role: 'ADMIN' };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
