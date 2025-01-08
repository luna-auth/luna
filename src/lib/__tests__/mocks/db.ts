import { vi } from 'vitest';
import { createTestDb } from '../../../db/testDb';

// Tworzymy testową bazę danych
const testDb = await createTestDb();

// Mockujemy moduł db
export const db = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockImplementation(() => []),  // Domyślnie pusta tablica
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  
  // Metoda do resetowania mocków
  __reset: () => {
    vi.clearAllMocks();
    testDb.init();
    // Resetujemy domyślne implementacje
    db.where.mockImplementation(() => []);
  },
  
  // Metoda do ustawiania zwracanych wartości
  __setReturnValue: (method: string, value: any) => {
    if (method === 'where') {
      db.where.mockImplementation(() => value);
    } else {
      (db as any)[method].mockImplementation(() => value);
    }
  }
}; 