/// <reference types=".astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DB_URL: string;
  readonly SESSION_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Session {
  id: string;
  userId: number;
  expiresAt: Date;
}

interface User {
  id: number;
  email: string;
}

declare namespace App {
  interface Locals {
    session: Session | null;
    user: User | null;
  }
}