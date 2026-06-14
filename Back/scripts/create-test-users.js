const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    const password = 'Test@1234';
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Admin User
    const adminEmail = 'admin@test.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          isActive: true
        }
      });
      console.log('✅ Admin user created!');
      console.log('   📧 Email:', adminEmail);
      console.log('   🔑 Password:', password);
      console.log('   👤 Role: ADMIN');
      console.log('   🆔 ID:', admin.id);
    } else {
      console.log('ℹ️  Admin user already exists');
      console.log('   📧 Email:', adminEmail);
      console.log('   🔑 Password:', password);
    }

    console.log('');

    // Create Regular User
    const userEmail = 'user@test.com';
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!existingUser) {
      const user = await prisma.user.create({
        data: {
          email: userEmail,
          password: hashedPassword,
          name: 'Regular User',
          role: 'USER',
          isActive: true
        }
      });
      console.log('✅ Regular user created!');
      console.log('   📧 Email:', userEmail);
      console.log('   🔑 Password:', password);
      console.log('   👤 Role: USER');
      console.log('   🆔 ID:', user.id);
    } else {
      console.log('ℹ️  Regular user already exists');
      console.log('   📧 Email:', userEmail);
      console.log('   🔑 Password:', password);
    }

    console.log('');
    console.log('🎉 Test users ready!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   Admin:  admin@test.com / Test@1234');
    console.log('   User:   user@test.com / Test@1234');

  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
