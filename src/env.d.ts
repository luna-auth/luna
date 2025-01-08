import type { Session } from "./lib/session";
import type { User } from "./db/schema";

export {};

declare global {
  namespace App {
    interface Locals {
      session: Session | null;
      user: User | null;
    }
  }
}