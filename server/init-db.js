import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    const schema = fs.readFileSync('./schema.sql', 'utf8');

    console.log('Running schema.sql...');
    await pool.query(schema);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
