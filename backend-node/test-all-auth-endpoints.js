const http = require('http');

async function testAllAuthEndpoints() {
  console.log('🔍 Testing all authentication endpoints...\\n');
  
  const credentials = {
    email: 'richard.roach@gmail.com',
    password: 'T1PAdmin1234!'
  };
  
  const credentialsAlt = {
    username: 'richard.roach@gmail.com', 
    password: 'T1PAdmin1234!'
  };
  
  const credentialsKeycloak = {
    keycloakToken: 'dummy-token'
  };
  
  // List of endpoints to test
  const endpoints = [
    { path: '/auth/login', data: credentials, desc: 'Old login with email/password' },
    { path: '/auth/login', data: credentialsAlt, desc: 'Old login with username/password' },
    { path: '/auth/login', data: credentialsKeycloak, desc: 'Old login with keycloak token' },
    { path: '/api/auth/login', data: credentials, desc: 'API login with email/password' },
    { path: '/api/auth/login', data: credentialsAlt, desc: 'API login with username/password' }, 
    { path: '/api/auth/login', data: credentialsKeycloak, desc: 'API login with keycloak token' },
    { path: '/api/auth/authenticate', data: credentials, desc: 'API authenticate with email/password' },
    { path: '/api/auth/demo-login', data: {}, desc: 'Demo login endpoint' }
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint.path, endpoint.data, endpoint.desc);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
  }
}

async function testEndpoint(path, data, description) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`🧪 Testing: ${description}`);
    console.log(`   Endpoint: POST ${path}`);
    console.log(`   Data: ${Object.keys(data).join(', ')}`);
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('   ✅ SUCCESS - Login worked!');
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.user) {
              console.log(`   User: ${parsed.user.email || parsed.user.username} (${parsed.user.id})`);
            }
            if (parsed.tokens) {
              console.log('   ✅ Tokens received');
            }
          } catch (e) {
            console.log('   Response:', responseData.substring(0, 200));
          }
        } else if (res.statusCode === 401) {
          console.log('   ❌ UNAUTHORIZED - Invalid credentials');
          try {
            const parsed = JSON.parse(responseData);
            console.log(`   Error: ${parsed.message || parsed.error}`);
          } catch (e) {
            console.log('   Response:', responseData);
          }
        } else if (res.statusCode === 400) {
          console.log('   ❌ BAD REQUEST');
          try {
            const parsed = JSON.parse(responseData);
            console.log(`   Error: ${parsed.message || parsed.error}`);
          } catch (e) {
            console.log('   Response:', responseData);
          }
        } else if (res.statusCode === 404) {
          console.log('   ❌ NOT FOUND - Endpoint does not exist');
        } else if (res.statusCode === 429) {
          console.log('   ⚠️  RATE LIMITED');
        } else {
          console.log('   Response:', responseData.substring(0, 200));
        }
        
        console.log('');
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ REQUEST FAILED: ${e.message}`);
      console.log('');
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

testAllAuthEndpoints();