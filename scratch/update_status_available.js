const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres.rkwnsabzjcblnhapyuwi:69lpeiSoE2bw3l8x@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
        }
    }
});

async function main() {
  console.log('Đang kết nối tới database để cập nhật...');
  try {
    const result = await prisma.forklift.updateMany({
      where: {
        status: 'Published'
      },
      data: {
        status: 'Available'
      }
    });
    console.log(`Thành công! Đã cập nhật trạng thái cho ${result.count} xe nâng sang Available.`);
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
