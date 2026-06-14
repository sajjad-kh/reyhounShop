const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000/api/v1';

async function testSyncEndpoint() {
  try {
    console.log('🔐 Step 1: Login as admin...\n');
    
    // Login to get JWT token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'Test@1234'
    });

    const token = loginResponse.data.data?.token || loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log(`🎫 Token: ${token ? token.substring(0, 20) + '...' : 'N/A'}\n`);

    console.log('🔄 Step 2: Testing sync endpoint...\n');
    
    // Test sync endpoint
    const syncResponse = await axios.post(
      `${BASE_URL}/shipping-methods/sync`,
      {}, // Empty body - no token required
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Sync successful!');
    console.log('\n📊 Response:');
    console.log(JSON.stringify(syncResponse.data, null, 2));
    
    if (syncResponse.data.data && syncResponse.data.data.methods) {
      console.log(`\n📦 Total synced methods: ${syncResponse.data.data.syncedCount}`);
      console.log(`📋 Methods list:`);
      syncResponse.data.data.methods.forEach((method, index) => {
        console.log(`   ${index + 1}. ${method.name} (ID: ${method.id}, Basalam ID: ${method.basalamId})`);
        console.log(`      Base Cost: ${method.baseCost}, Additional: ${method.additionalCost}`);
      });
    }

  } catch (error) {
    console.error('❌ Error occurred:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`   Message: ${error.message}`);
    }
  }
}

async function testErrorScenarios() {
  console.log('\n\n🧪 Testing Error Scenarios\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Without authentication
  console.log('Test 1: Calling sync without authentication...');
  try {
    await axios.post(`${BASE_URL}/shipping-methods/sync`, {});
    console.log('❌ Should have failed but succeeded!');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctly returned 401 Unauthorized');
      console.log(`   Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 2: With non-admin user
  console.log('\nTest 2: Calling sync with non-admin user...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@test.com',
      password: 'Test@1234'
    });
    const userToken = loginResponse.data.data?.token || loginResponse.data.token;

    await axios.post(
      `${BASE_URL}/shipping-methods/sync`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      }
    );
    console.log('❌ Should have failed but succeeded!');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ Correctly returned 403 Forbidden');
      console.log(`   Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

async function verifyDatabase() {
  console.log('\n\n🗄️  Verifying Database\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const shippingMethods = await prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });

    console.log(`✅ Found ${shippingMethods.length} active shipping methods in database:`);
    shippingMethods.forEach((method, index) => {
      console.log(`\n   ${index + 1}. ${method.name}`);
      console.log(`      ID: ${method.id}`);
      console.log(`      Basalam ID: ${method.basalamId || 'N/A'}`);
      console.log(`      Base Cost: ${method.baseCost}`);
      console.log(`      Additional Cost: ${method.additionalCost}`);
      console.log(`      Last Synced: ${method.lastSyncedAt ? method.lastSyncedAt.toLocaleString() : 'Never'}`);
    });

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Testing Basalam Shipping Sync Endpoint                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  await testSyncEndpoint();
  await testErrorScenarios();
  await verifyDatabase();

  console.log('\n✅ All tests completed!\n');
}

runAllTests();
