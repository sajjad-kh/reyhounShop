const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...');

    const email = 'user@test.com';
    const password = 'Test@1234';
    const name = 'Admin User';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  User already exists with email:', email);
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🔑 Role:', existingUser.role);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', user.name);
    console.log('🔐 Role:', user.role);
    console.log('\n🎉 You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
