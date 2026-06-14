const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixUserPassword() {
  try {
    console.log('🔧 Fixing user password...');

    // Hash password
    const hashedPassword = await bcrypt.hash('Test@1234', 12);

    // Update user password
    const user = await prisma.user.update({
      where: { email: 'user@test.com' },
      data: {
        password: hashedPassword
      }
    });

    console.log('✅ User password updated successfully!');
    console.log('📧 Email: user@test.com');
    console.log('🔑 Password: Test@1234');

  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserPassword();