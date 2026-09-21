const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding isThumbnail column...');
    await prisma.$executeRawUnsafe('ALTER TABLE "Media" ADD COLUMN "isThumbnail" BOOLEAN NOT NULL DEFAULT false;');
    console.log('Column added successfully.');
  } catch (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
