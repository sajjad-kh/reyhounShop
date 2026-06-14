const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔐 Testing login...');

    const users = [
      { email: 'admin@test.com', password: 'Test@1234', role: 'ADMIN' },
      { email: 'user@test.com', password: 'Test@1234', role: 'USER' }
    ];

    for (const user of users) {
      console.log(`\n👤 Testing ${user.email}...`);
      
      try {
        const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
          email: user.email,
          password: user.password
        });

        if (response.data.success) {
          console.log('✅ Login successful!');
          console.log(`🎭 Role: ${response.data.data.user.role}`);
          console.log(`👤 Name: ${response.data.data.user.name}`);
          console.log(`🔑 Token: ${response.data.data.token.substring(0, 20)}...`);
        } else {
          console.log('❌ Login failed:', response.data);
        }
      } catch (error) {
        console.log('❌ Login error:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testLogin();