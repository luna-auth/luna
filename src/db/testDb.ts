import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

// Create in-memory database for testing
export function createTestDb() {
  const client = createClient({
    url: ':memory:',
  });

  const db = drizzle(client, { schema });

  // Helper to initialize database
  async function init() {
    console.log('Initializing test database...');
    // Create tables using Drizzle schema
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      );
    `);
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
    console.log('Test database initialized.');
  }

  // Helper to close connection
  async function close() {
    console.log('Closing test database connection...');
    await client.close();
    console.log('Test database connection closed.');
  }

  return {
    db,
    client,
    init,
    close,
  };
}
