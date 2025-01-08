import { db } from '@/db/index';
import { usersTable } from './schema';

async function test() {
  const users = await db.select().from(usersTable);
  console.log('Users:', users);
}

test().catch((error) => console.error(error));
