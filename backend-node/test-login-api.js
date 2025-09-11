const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import the auth service to test it directly  
async function testLoginAPI() {
  console.log('🔍 Testing login API directly...\\n');
  
  try {
    console.log('1️⃣ Testing AuthService directly...');
    
    // Try to import and use the actual auth service
    let AuthService;
    try {
      // Import using Node.js require with TypeScript compilation
      delete require.cache[require.resolve('./src/modules/auth/auth.service.ts')];
      AuthService = require('./src/modules/auth/auth.service.ts').AuthService;
      console.log('✅ AuthService imported successfully');
    } catch (importError) {
      console.log('❌ Could not import AuthService directly:', importError.message);
      console.log('   This is expected in a TypeScript project');
      
      // Let's check if the built version exists
      try {
        AuthService = require('./dist/modules/auth/auth.service.js').AuthService;
        console.log('✅ AuthService imported from dist folder');
      } catch (distError) {
        console.log('❌ Could not import from dist either:', distError.message);
        console.log('\\n   Let\'s check environment variables and server config instead...');
      }
    }
    
    console.log('\\n2️⃣ Checking environment variables...');
    
    const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
    const envStatus = {};
    
    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      envStatus[varName] = {
        exists: !!value,
        isDefault: value === 'your-jwt-secret-key-here-change-in-production' || 
                  value === 'your-refresh-token-secret-key-here-change-in-production'
      };
    });
    
    console.log('   Environment variables:');
    Object.entries(envStatus).forEach(([key, status]) => {
      console.log(`     ${key}: ${status.exists ? 'SET' : 'MISSING'}${status.isDefault ? ' (DEFAULT - INSECURE!)' : ''}`);
    });
    
    console.log('\\n3️⃣ Testing manual API call...');
    
    // Test making an HTTP request to the login endpoint if server is running
    const testCredentials = {
      email: 'Richard.Roach@gmail.com',
      password: 'T1PAdmin1234!'
    };
    
    console.log('   Test credentials:', {
      email: testCredentials.email,
      password: '***hidden***'
    });
    
    // Check if we can make a simple HTTP request
    try {
      const http = require('http');
      const postData = JSON.stringify(testCredentials);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      console.log('   Making HTTP request to login endpoint...');
      
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('   Response status:', res.statusCode);
          console.log('   Response headers:', res.headers);
          console.log('   Response body:', data);
          
          if (res.statusCode === 200) {
            console.log('\\n✅ LOGIN API WORKING!');
          } else {
            console.log('\\n❌ LOGIN API FAILED');
            try {
              const errorData = JSON.parse(data);
              console.log('   Error details:', errorData);
            } catch (e) {
              console.log('   Raw error:', data);
            }
          }
        });
      });
      
      req.on('error', (e) => {
        console.log('❌ HTTP request failed:', e.message);
        console.log('   This usually means the server is not running');
        console.log('   Try starting the server with: npm run dev');
      });
      
      req.write(postData);
      req.end();
      
      // Give the request time to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (httpError) {
      console.log('❌ HTTP test failed:', httpError.message);
    }
    
    console.log('\\n4️⃣ Checking server startup requirements...');
    
    const fs = require('fs');
    
    // Check if .env file exists
    const envExists = fs.existsSync('.env');
    console.log('   .env file exists:', envExists ? 'YES' : 'NO');
    
    if (envExists) {
      const envContent = fs.readFileSync('.env', 'utf8');
      const hasJWTSecret = envContent.includes('JWT_SECRET=') && !envContent.includes('your-jwt-secret-key-here');
      const hasRefreshSecret = envContent.includes('JWT_REFRESH_SECRET=') && !envContent.includes('your-refresh-token-secret-key-here');
      
      console.log('   .env has secure JWT_SECRET:', hasJWTSecret ? 'YES' : 'NO');
      console.log('   .env has secure JWT_REFRESH_SECRET:', hasRefreshSecret ? 'YES' : 'NO');
      
      if (!hasJWTSecret || !hasRefreshSecret) {
        console.log('\\n⚠️  WARNING: Insecure JWT secrets detected!');
        console.log('   The server may refuse to start with default secrets.');
        console.log('   Update your .env file with secure secret keys.');
      }
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoginAPI();