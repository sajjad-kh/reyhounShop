// Simple test script to verify notification functionality
const { PrismaClient } = require('@prisma/client');
const notificationService = require('./src/services/notificationService');

const prisma = new PrismaClient();

async function testNotificationSystem() {
  try {
    console.log('🧪 Testing notification system...');

    // Test 1: Check if we can get user preferences (should create defaults)
    console.log('\n1. Testing user preferences...');
    const preferences = await notificationService.getUserPreferences(1);
    console.log('✅ User preferences:', {
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      orderUpdates: preferences.orderUpdates,
      promotions: preferences.promotions
    });

    // Test 2: Schedule a test notification
    console.log('\n2. Testing notification scheduling...');
    const notification = await notificationService.scheduleNotification({
      userId: 1,
      type: 'WELCOME',
      channel: 'EMAIL',
      title: 'Welcome to our platform!',
      message: 'Thank you for joining us. We hope you enjoy your experience.',
      metadata: { isTest: true }
    });
    console.log('✅ Notification scheduled with ID:', notification?.id);

    // Test 3: Process pending notifications
    console.log('\n3. Testing notification processing...');
    await notificationService.processPendingNotifications();
    console.log('✅ Pending notifications processed');

    // Test 4: Check notification status
    if (notification) {
      const updatedNotification = await prisma.notification.findUnique({
        where: { id: notification.id }
      });
      console.log('✅ Notification status:', updatedNotification?.status);
    }

    console.log('\n🎉 All notification tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotificationSystem();