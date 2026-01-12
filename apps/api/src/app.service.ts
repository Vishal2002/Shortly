import { Injectable } from '@nestjs/common';
import { prisma } from '@shortly/database';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Shortly API is running! 🚀';
  }

  async testDatabase() {
    const count = await prisma.user.count();
    return { message: 'Database connected', userCount: count };
  }
}