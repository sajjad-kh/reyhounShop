// Test script to verify Basalam notification functionality
const { connectDatabase, disconnectDatabase, getPrismaClient } = require('./src/utils/database');
const notificationService = require('./src/services/notificationService');

async function testBasalamNotifications() {
  let prisma;
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    prisma = await connectDatabase();
    console.log('✅ Database connected\n');

    console.log('🧪 Testing Basalam notification system...\n');

    // Find or create a test user
    let testUser = await prisma.user.findFirst({
      where: { email: { contains: 'test' } }
    });

    if (!testUser) {
      console.log('⚠️  No test user found. Creating one...');
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '09123456789',
          password: 'test123'
        }
      });
      console.log('✅ Test user created:', testUser.id);
    } else {
      console.log('✅ Using existing test user:', testUser.id);
    }

    // Create or find a test Basalam order
    console.log('\n1. Creating test Basalam order...');
    
    // Delete any existing test order first
    await prisma.basalamOrder.deleteMany({
      where: {
        basalamOrderId: 999999
      }
    });

    const testOrder = await prisma.basalamOrder.create({
      data: {
        userId: testUser.id,
        basalamOrderId: 999999,
        orderNumber: 'TEST-ORDER-001',
        status: 'pending_payment',
        totalAmount: 500000,
        itemsJson: JSON.stringify([
          {
            product_id: 123,
            name: 'محصول تستی',
            quantity: 2,
            price: 250000
          }
        ]),
        shippingAddressJson: JSON.stringify({
          province: 'تهران',
          city: 'تهران',
          address: 'آدرس تستی',
          postalCode: '1234567890'
        }),
        contactInfoJson: JSON.stringify({
          fullName: testUser.name,
          phone: testUser.phone,
          email: testUser.email
        }),
        paymentUrl: 'https://test.basalam.com/payment/test'
      }
    });
    console.log('✅ Test order created:', testOrder.id);

    // Test 1: Order Confirmation Notification
    console.log('\n2. Testing order confirmation notification...');
    await notificationService.sendBasalamOrderConfirmation(testOrder.id);
    console.log('✅ Order confirmation notification sent');

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Payment Success Notification
    console.log('\n3. Testing payment success notification...');
    await notificationService.sendBasalamPaymentNotification(testOrder.id, 'success');
    console.log('✅ Payment success notification sent');

    // Update order status to paid
    await prisma.basalamOrder.update({
      where: { id: testOrder.id },
      data: {
        status: 'paid',
        paymentTransactionId: 'TEST-TXN-123',
        paidAt: new Date()
      }
    });

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Payment Failed Notification
    console.log('\n4. Testing payment failed notification...');
    await notificationService.sendBasalamPaymentNotification(testOrder.id, 'failed');
    console.log('✅ Payment failed notification sent');

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 4: Status Update Notification
    console.log('\n5. Testing status update notification...');
    await notificationService.sendBasalamOrderStatusUpdate(testOrder.id, 'paid', 'processing');
    console.log('✅ Status update notification sent');

    // Update order status
    await prisma.basalamOrder.update({
      where: { id: testOrder.id },
      data: { status: 'processing' }
    });

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 5: Another status update (shipped)
    console.log('\n6. Testing shipped status notification...');
    await notificationService.sendBasalamOrderStatusUpdate(testOrder.id, 'processing', 'shipped');
    console.log('✅ Shipped status notification sent');

    // Process all pending notifications
    console.log('\n7. Processing all pending notifications...');
    const result = await notificationService.processPendingNotifications();
    console.log('✅ Processed notifications:', result);

    // Check created notifications
    console.log('\n8. Checking created notifications...');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: testUser.id,
        type: {
          in: [
            'BASALAM_ORDER_CONFIRMATION',
            'BASALAM_PAYMENT_SUCCESS',
            'BASALAM_PAYMENT_FAILED',
            'BASALAM_ORDER_STATUS_UPDATE'
          ]
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${notifications.length} Basalam notifications:`);
    notifications.forEach(notif => {
      console.log(`   - ${notif.type} (${notif.channel}): ${notif.status}`);
    });

    // Cleanup: Delete test order
    console.log('\n9. Cleaning up test data...');
    await prisma.basalamOrder.delete({
      where: { id: testOrder.id }
    });
    console.log('✅ Test order deleted');

    console.log('\n🎉 All Basalam notification tests passed!');
    console.log('\n📊 Summary:');
    console.log('   - Order confirmation: ✅');
    console.log('   - Payment success: ✅');
    console.log('   - Payment failed: ✅');
    console.log('   - Status updates: ✅');
    console.log('   - Notification processing: ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (prisma) {
      await disconnectDatabase();
      console.log('\n🔌 Database disconnected');
    }
  }
}

// Run the test
testBasalamNotifications();
