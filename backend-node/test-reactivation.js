// Simple test script to verify user reactivation functionality
const apiBase = 'http://localhost:3000/api/user-management';

async function testReactivation() {
  console.log('🔧 Testing User Reactivation Functionality\n');

  try {
    // Test 1: Get users to find a suspended user
    console.log('1. Fetching users...');
    const usersResponse = await fetch(`${apiBase}/users?accountStatus=SUSPENDED`, {
      headers: { 'x-auth-bypass': 'true' }
    });
    
    if (!usersResponse.ok) {
      console.log('❌ Failed to fetch users:', await usersResponse.text());
      return;
    }

    const usersData = await usersResponse.json();
    const suspendedUsers = usersData.users || usersData;
    
    if (!Array.isArray(suspendedUsers) || suspendedUsers.length === 0) {
      console.log('⚠️  No suspended users found to test reactivation');
      console.log('   Creating a test scenario...');
      
      // Get any active user to suspend first
      const activeResponse = await fetch(`${apiBase}/users?accountStatus=ACTIVE&pageSize=1`, {
        headers: { 'x-auth-bypass': 'true' }
      });
      
      const activeData = await activeResponse.json();
      const activeUsers = activeData.users || activeData;
      
      if (activeUsers.length === 0) {
        console.log('❌ No users found to test with');
        return;
      }
      
      const testUser = activeUsers[0];
      console.log(`   Suspending user ${testUser.id} (${testUser.person?.firstName || testUser.username}) for testing...`);
      
      // Suspend the user first
      const suspendResponse = await fetch(`${apiBase}/users/${testUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-bypass': 'true'
        },
        body: JSON.stringify({
          accountStatus: 'SUSPENDED',
          statusReason: 'Suspended for reactivation testing'
        })
      });
      
      if (!suspendResponse.ok) {
        console.log('❌ Failed to suspend user for testing:', await suspendResponse.text());
        return;
      }
      
      console.log('✅ User suspended successfully\n');
      
      // Now test reactivation
      await testReactivateUser(testUser.id, testUser.person?.firstName || testUser.username);
      
    } else {
      // Use existing suspended user
      const testUser = suspendedUsers[0];
      console.log(`✅ Found suspended user: ${testUser.id} (${testUser.person?.firstName || testUser.username})\n`);
      await testReactivateUser(testUser.id, testUser.person?.firstName || testUser.username);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

async function testReactivateUser(userId, userName) {
  console.log(`2. Testing reactivation of user ${userName}...`);
  
  try {
    // Test the reactivation endpoint
    const reactivateResponse = await fetch(`${apiBase}/users/${userId}/reactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true'
      },
      body: JSON.stringify({
        reason: 'Reactivated via API test'
      })
    });
    
    if (!reactivateResponse.ok) {
      const errorText = await reactivateResponse.text();
      console.log('❌ Reactivation failed:', errorText);
      return;
    }
    
    const result = await reactivateResponse.json();
    console.log('✅ Reactivation successful!');
    console.log(`   Status: ${result.user.accountStatus}`);
    console.log(`   Reason: ${result.user.statusReason}`);
    console.log(`   Message: ${result.message}\n`);
    
    // Test 3: Verify the user is now active
    console.log('3. Verifying user status...');
    const checkResponse = await fetch(`${apiBase}/users/${userId}`, {
      headers: { 'x-auth-bypass': 'true' }
    });
    
    if (checkResponse.ok) {
      const userData = await checkResponse.json();
      if (userData.accountStatus === 'ACTIVE') {
        console.log('✅ User status confirmed as ACTIVE');
      } else {
        console.log(`❌ User status is ${userData.accountStatus}, expected ACTIVE`);
      }
    }
    
    // Test 4: Try to reactivate an already active user (should fail)
    console.log('\n4. Testing reactivation of active user (should fail)...');
    const failResponse = await fetch(`${apiBase}/users/${userId}/reactivate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true'
      },
      body: JSON.stringify({
        reason: 'This should fail'
      })
    });
    
    if (failResponse.status === 400) {
      console.log('✅ Correctly rejected reactivation of active user');
    } else {
      console.log('❌ Should have rejected reactivation of active user');
    }
    
  } catch (error) {
    console.log('❌ Reactivation test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testReactivation().then(() => {
    console.log('\n🏁 Test completed');
  });
}

module.exports = { testReactivation };