const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createRegularUser() {
  try {
    console.log('👤 Creating regular user...');

    const email = 'user@test.com';
    const password = 'Test@1234';
    const name = 'Test User';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('⚠️  User already exists with email:', email);
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🔑 Role:', existingUser.role);
      
      // If it's an admin, ask if we should update to regular user
      if (existingUser.role === 'ADMIN') {
        console.log('\n🔄 Updating user role from ADMIN to USER...');
        const updatedUser = await prisma.user.update({
          where: { email },
          data: { role: 'USER' }
        });
        console.log('✅ User role updated to USER');
      }
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create regular user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    });

    console.log('✅ Regular user created successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', user.name);
    console.log('🔐 Role:', user.role);
    console.log('\n🎉 You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error creating regular user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRegularUser();
