// Simple schema validation script
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Prisma schema...');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20240819000000_initial_comprehensive_schema', 'migration.sql');

// Check if schema file exists
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Schema file not found');
  process.exit(1);
}

// Check if migration file exists
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found');
  process.exit(1);
}

// Read and validate schema
const schema = fs.readFileSync(schemaPath, 'utf8');
const migration = fs.readFileSync(migrationPath, 'utf8');

// Basic validation checks
const validations = [
  { name: 'Schema has generator client', check: schema.includes('generator client') },
  { name: 'Schema has datasource db', check: schema.includes('datasource db') },
  { name: 'Schema has Person model', check: schema.includes('model Person') },
  { name: 'Schema has User model', check: schema.includes('model User') },
  { name: 'Schema has Transition model', check: schema.includes('model Transition') },
  { name: 'Schema has vector support', check: schema.includes('vector(1536)') },
  { name: 'Migration has CREATE TABLE statements', check: migration.includes('CREATE TABLE') },
  { name: 'Migration has extensions', check: migration.includes('CREATE EXTENSION') },
  { name: 'Migration has indexes', check: migration.includes('CREATE INDEX') },
  { name: 'Migration has foreign keys', check: migration.includes('ADD CONSTRAINT') },
];

let allValid = true;
validations.forEach(validation => {
  if (validation.check) {
    console.log(`✅ ${validation.name}`);
  } else {
    console.log(`❌ ${validation.name}`);
    allValid = false;
  }
});

// Count models and tables
const modelMatches = schema.match(/^model\s+\w+/gm);
const tableMatches = migration.match(/CREATE TABLE\s+"[\w_]+"/g);

console.log(`\n📊 Schema Statistics:`);
console.log(`   Models: ${modelMatches ? modelMatches.length : 0}`);
console.log(`   Tables: ${tableMatches ? tableMatches.length : 0}`);

if (allValid) {
  console.log('\n🎉 Schema validation passed!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Start infrastructure: docker-compose up -d');
  console.log('   2. Run migrations: npm run db:migrate:deploy');
  console.log('   3. Generate client: npm run db:generate');
  console.log('   4. Seed database: npm run db:seed');
  console.log('   5. Start development: npm run dev');
} else {
  console.log('\n❌ Schema validation failed!');
  process.exit(1);
}