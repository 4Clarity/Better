// Test script for email-first login flow
const apiBase = 'http://localhost:3000/api/auth';

async function testEmailLoginFlow() {
  console.log('🔧 Testing Email-First Login Flow\n');

  try {
    // Test 1: Email Lookup
    console.log('1. Testing email lookup...');
    const testEmail = 'admin@example.com'; // Should exist in seed data
    
    const lookupResponse = await fetch(`${apiBase}/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true'
      },
      body: JSON.stringify({ email: testEmail })
    });
    
    if (!lookupResponse.ok) {
      const errorText = await lookupResponse.text();
      console.log('❌ Email lookup failed:', errorText);
      
      // Try getting available users first
      console.log('   Fetching available users for testing...');
      const usersResponse = await fetch('http://localhost:3000/api/user-management/users?pageSize=5', {
        headers: { 'x-auth-bypass': 'true' }
      });
      
      if (usersResponse.ok) {
        const userData = await usersResponse.json();
        const users = userData.users || userData;
        if (users.length > 0) {
          const testUser = users[0];
          console.log(`   Found user: ${testUser.person?.primaryEmail || testUser.username}`);
          if (testUser.person?.primaryEmail) {
            await testWithEmail(testUser.person.primaryEmail);
          }
        }
      }
      return;
    }

    const lookupData = await lookupResponse.json();
    console.log('✅ Email lookup successful');
    console.log(`   User: ${lookupData.data.displayName}`);
    console.log(`   Email: ${lookupData.data.email}`);
    console.log(`   Auth methods: ${lookupData.data.authMethods.join(', ')}`);

    // Test 2: Password Authentication
    if (lookupData.data.authMethods.includes('password')) {
      console.log('\n2. Testing password authentication...');
      
      const authResponse = await fetch(`${apiBase}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-bypass': 'true'
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'demo', // Test password
          method: 'password'
        })
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.log('❌ Password authentication failed:', errorText);
        
        // Try other valid passwords
        const passwords = ['password', 'admin'];
        for (const pwd of passwords) {
          console.log(`   Trying password: ${pwd}`);
          const retryResponse = await fetch(`${apiBase}/authenticate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-bypass': 'true'
            },
            body: JSON.stringify({
              email: testEmail,
              password: pwd,
              method: 'password'
            })
          });
          
          if (retryResponse.ok) {
            const authData = await retryResponse.json();
            console.log('✅ Password authentication successful');
            console.log(`   Access token: ${authData.tokens.accessToken.substring(0, 20)}...`);
            console.log(`   User: ${authData.user.username}`);
            break;
          }
        }
      } else {
        const authData = await authResponse.json();
        console.log('✅ Password authentication successful');
        console.log(`   Access token: ${authData.tokens.accessToken.substring(0, 20)}...`);
        console.log(`   User: ${authData.user.username}`);
      }
    }

    // Test 3: Invalid email
    console.log('\n3. Testing invalid email...');
    const invalidResponse = await fetch(`${apiBase}/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true'
      },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });
    
    if (invalidResponse.status === 404) {
      console.log('✅ Correctly handled invalid email');
    } else {
      console.log('❌ Should have returned 404 for invalid email');
    }

    // Test 4: Invalid password
    console.log('\n4. Testing invalid password...');
    const badPasswordResponse = await fetch(`${apiBase}/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongpassword',
        method: 'password'
      })
    });
    
    if (badPasswordResponse.status === 401) {
      console.log('✅ Correctly rejected invalid password');
    } else {
      console.log('❌ Should have rejected invalid password');
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

async function testWithEmail(email) {
  console.log(`\n📧 Testing with email: ${email}`);
  
  const lookupResponse = await fetch(`${apiBase}/lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-bypass': 'true'
    },
    body: JSON.stringify({ email })
  });
  
  if (lookupResponse.ok) {
    const lookupData = await lookupResponse.json();
    console.log('✅ Email lookup successful');
    console.log(`   User: ${lookupData.data.displayName}`);
    console.log(`   Auth methods: ${lookupData.data.authMethods.join(', ')}`);
  } else {
    console.log('❌ Email lookup failed');
  }
}

// Run the test
if (typeof require !== 'undefined' && require.main === module) {
  testEmailLoginFlow().then(() => {
    console.log('\n🏁 Email login flow test completed');
  });
}

module.exports = { testEmailLoginFlow };