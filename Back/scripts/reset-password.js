const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = 'sajjad.khos@gmail.com';
    const newPassword = 'Test@1234';
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await prisma.user.update({
      where: { email },
      data: { 
        password: hashedPassword
      }
    });

    console.log('✅ Password reset successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 New Password:', newPassword);
    console.log('👤 User ID:', user.id);
    console.log('👤 Name:', user.name);
    
    // Verify the password works
    const isMatch = await bcrypt.compare(newPassword, user.password);
    console.log('\n🔐 Verification:', isMatch ? '✅ Password works!' : '❌ Password failed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
