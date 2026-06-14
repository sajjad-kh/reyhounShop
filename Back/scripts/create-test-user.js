const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔧 Creating test users...');

    // Hash passwords
    const adminPassword = await bcrypt.hash('Test@1234', 12);
    const userPassword = await bcrypt.hash('Test@1234', 12);

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        password: adminPassword,
        name: 'ادمین تست',
        phone: '09111111111',
        role: 'ADMIN'
      }
    });

    // Create regular user
    const user = await prisma.user.upsert({
      where: { email: 'user@test.com' },
      update: {},
      create: {
        email: 'user@test.com',
        password: userPassword,
        name: 'کاربر تست',
        phone: '09222222222',
        role: 'USER'
      }
    });

    console.log('✅ Test users created successfully!');
    console.log('\n👑 ADMIN USER:');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: Test@1234');
    console.log('👤 Name: ادمین تست');
    console.log('📱 Phone: 09111111111');
    
    console.log('\n👤 REGULAR USER:');
    console.log('📧 Email: user@test.com');
    console.log('🔑 Password: Test@1234');
    console.log('👤 Name: کاربر تست');
    console.log('📱 Phone: 09222222222');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();