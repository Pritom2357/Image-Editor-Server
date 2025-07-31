const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,                    // Maximum connections
  min: 0,                     // Minimum connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 5000 // 5 seconds
};

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});


async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Server time:', result.rows[0].now);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`⌛ Query executed in ${duration}ms`);
    return result;
  } catch (err) {
    console.error('❌ Query error:', err.message);
    throw err;
  }
}

async function getClient() {
  return await pool.connect();
}


async function closePool() {
  await pool.end();
  console.log('✅ Database pool closed');
}

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

testConnection();

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};
