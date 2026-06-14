const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = 'user@test.com';
    
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    console.log('✅ User found:');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', user.name);
    console.log('🔐 Role:', user.role);
    console.log('✔️  Active:', user.isActive);
    console.log('🔑 Has Password:', user.password ? 'Yes' : 'No');
    console.log('📅 Created:', user.createdAt);

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
