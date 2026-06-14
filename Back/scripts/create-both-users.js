const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createBothUsers() {
  try {
    console.log('👥 Creating both admin and regular users...\n');

    const password = 'Test@1234';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin User
    console.log('1️⃣ Creating Admin User...');
    const adminEmail = 'admin@test.com';
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    let admin;
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, updating...');
      admin = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          name: 'Admin User'
        }
      });
      console.log('✅ Admin user updated');
    } else {
      admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin user created');
    }

    console.log('📧 Email:', admin.email);
    console.log('🔑 Password:', password);
    console.log('🔐 Role:', admin.role);
    console.log('');

    // Create Regular User
    console.log('2️⃣ Creating Regular User...');
    const userEmail = 'user@test.com';
    
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    let user;
    if (existingUser) {
      console.log('⚠️  Regular user already exists, updating...');
      user = await prisma.user.update({
        where: { email: userEmail },
        data: {
          password: hashedPassword,
          role: 'USER',
          name: 'Test User'
        }
      });
      console.log('✅ Regular user updated');
    } else {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          password: hashedPassword,
          name: 'Test User',
          role: 'USER'
        }
      });
      console.log('✅ Regular user created');
    }

    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
    console.log('🔐 Role:', user.role);
    console.log('');

    console.log('🎉 Both users are ready!');
    console.log('\n📋 Summary:');
    console.log('─────────────────────────────────────');
    console.log('Admin User:');
    console.log('  📧 Email: admin@test.com');
    console.log('  🔑 Password: Test@1234');
    console.log('  🔐 Role: ADMIN');
    console.log('');
    console.log('Regular User:');
    console.log('  📧 Email: user@test.com');
    console.log('  🔑 Password: Test@1234');
    console.log('  🔐 Role: USER');
    console.log('─────────────────────────────────────');

  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBothUsers();
