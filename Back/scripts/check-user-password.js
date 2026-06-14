const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUserPassword() {
  try {
    console.log('🔍 Checking user passwords...');

    // Get users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['admin@test.com', 'user@test.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true
      }
    });

    console.log(`\n📊 Found ${users.length} users:`);

    for (const user of users) {
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log(`🎭 Role: ${user.role}`);
      
      // Test passwords
      const passwords = ['Test@1234', 'test@1234', 'Test123456'];
      
      for (const testPassword of passwords) {
        const isValid = await bcrypt.compare(testPassword, user.password);
        if (isValid) {
          console.log(`✅ Correct password: ${testPassword}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error checking passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPassword();