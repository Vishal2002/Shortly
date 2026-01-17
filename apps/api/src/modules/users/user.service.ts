import { Injectable } from '@nestjs/common';
import { prisma } from '@shortly/database';

@Injectable()
export class UsersService {
  async create(data: { email: string; password: string; name?: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name
        
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ 
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      },
    });
  }
}
