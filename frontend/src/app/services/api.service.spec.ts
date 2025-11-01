import { ApiService } from './api.service';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    defaults: {},
    get: jest.fn(async (url) => ({ data: { ok: true, url } })),
    post: jest.fn(async (url) => ({ data: { ok: true, url } })),
    delete: jest.fn(async (url) => ({ data: { ok: true, url } })),
  }
}));

declare global { interface Window { __APP_CONFIG?: { API_BASE?: string; AUTH_BASE?: string } } }

describe('ApiService (Jest)', () => {
  let service: ApiService;

  beforeEach(() => {
    window.__APP_CONFIG = { API_BASE: '/api', AUTH_BASE: '/auth' };
    service = new ApiService();
  });

  it('builds login URL from config', () => {
    expect(service.loginUrl()).toBe('/auth/google');
  });

  it('calls /auth/me', async () => {
    const r = await service.me();
    expect(r.ok).toBe(true);
  });

  it('lists accounts', async () => {
    const r = await service.listAccounts();
    expect(r.ok).toBe(true);
  });
});
