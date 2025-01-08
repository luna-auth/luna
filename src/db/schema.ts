import { sqliteTable, int, text } from 'drizzle-orm/sqlite-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const usersTable = sqliteTable('users', {
  id: int('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
});

export const sessionsTable = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => usersTable.id),
  expiresAt: int('expires_at', {
    mode: 'timestamp',
  }).notNull(),
});

export type User = InferSelectModel<typeof usersTable>;
export type NewUser = InferInsertModel<typeof usersTable>;

export type Session = InferSelectModel<typeof sessionsTable>;
export type NewSession = InferInsertModel<typeof sessionsTable>;
