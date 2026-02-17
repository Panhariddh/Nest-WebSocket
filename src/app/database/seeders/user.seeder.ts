import { UserModel } from '../models/user.model';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { UserRole } from 'src/app/common/enum/role.enum';

export class UserSeeder {
  static async seed() {
    const repo = AppDataSource.getRepository(UserModel);

    const hashPassword = async (plainText: string) => {
      return bcrypt.hash(plainText, 10);
    };

    const users = [
      {
        name: 'Super Admin',
        email: 'admin@example.com',
        password: await hashPassword('123456'),
        role: UserRole.ADMIN,
      },
      {
        name: 'John Doe',
        email: 'user1@example.com',
        password: await hashPassword('123456'),
        role: UserRole.USER,
      },
      {
        name: 'Jane Smith',
        email: 'user2@example.com',
        password: await hashPassword('123456'),
        role: UserRole.USER,
      },
    ];

    for (const userData of users) {
      const existing = await repo.findOne({
        where: { email: userData.email },
      });

      if (!existing) {
        await repo.save(userData);
        console.log(`Created user: ${userData.email}`);
      }
    }
  }
}
