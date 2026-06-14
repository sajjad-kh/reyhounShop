const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getAllUsersWithPasswords() {
  try {
    console.log('🔍 در حال جستجوی کاربران در دیتابیس...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        id: 'asc'
      }
    });

    if (users.length === 0) {
      console.log('❌ هیچ کاربری در دیتابیس پیدا نشد.');
      return;
    }

    console.log(`✅ تعداد ${users.length} کاربر پیدا شد:\n`);
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    users.forEach((user, index) => {
      console.log(`\n👤 کاربر ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   نام: ${user.name}`);
      console.log(`   ایمیل: ${user.email}`);
      console.log(`   تلفن: ${user.phone || 'ندارد'}`);
      console.log(`   نقش: ${user.role}`);
      console.log(`   وضعیت: ${user.isActive ? 'فعال' : 'غیرفعال'}`);
      console.log(`   رمز عبور (هش شده): ${user.password}`);
      console.log(`   تاریخ ایجاد: ${user.createdAt.toLocaleString('fa-IR')}`);
      console.log('───────────────────────────────────────────────────────────────────────────────');
    });

    console.log(`\n📊 خلاصه آمار:`);
    console.log(`   - کل کاربران: ${users.length}`);
    console.log(`   - ادمین‌ها: ${users.filter(u => u.role === 'ADMIN').length}`);
    console.log(`   - کاربران عادی: ${users.filter(u => u.role === 'USER').length}`);
    console.log(`   - کاربران فعال: ${users.filter(u => u.isActive).length}`);
    console.log(`   - کاربران غیرفعال: ${users.filter(u => !u.isActive).length}`);

  } catch (error) {
    console.error('❌ خطا در دریافت اطلاعات کاربران:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

getAllUsersWithPasswords();
