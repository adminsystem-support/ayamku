import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (connectionString) {
      global._postgresPool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      // Connect to user's Supabase PostgreSQL Online database
      global._postgresPool = new Pool({
        host: process.env.SUPABASE_HOST || 'db.vkgnmioktfpcijstfwlj.supabase.co',
        port: 5432,
        user: 'postgres',
        password: process.env.SUPABASE_PASSWORD || '@khafadi28April20',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
