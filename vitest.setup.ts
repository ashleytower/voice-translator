import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Supabase Auth
vi.mock('@/lib/api-utils', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    verifyAuth: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
  };
});

// Mock Supabase Server Client
vi.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: vi.fn().mockReturnValue({ error: null }),
      upsert: vi.fn().mockReturnValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
    }),
  }),
}));

// Set required env vars for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.GOOGLE_API_KEY = 'test-google-key';
process.env.DEEPGRAM_API_KEY = 'test-deepgram-key';
process.env.CARTESIA_API_KEY = 'test-cartesia-key';
