import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv';

dotenv.config();

const connectionString = `${process.env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })
export const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "test@shortly.com" },
    update: {}, // nothing to update if exists
    create: {
      email: "test@shortly.com",
      name: "Vishal Test",
      password: "test123", // plain text for dev only – hash in production!
      plan: "pro",
      videosLimit: 50,
      videosProcessed: 0,
    },
  });

  console.log('✅ Created test user:', user.email);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });