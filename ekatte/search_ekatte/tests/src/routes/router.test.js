import { describe, it, expect, vi } from 'vitest';
import { router } from '../../../src/routes/router.js';

vi.mock('../../../src/routes/search.js', () => ({
  searchHandler: vi.fn(async (res) => res.end('mocked')),
}));

describe('router', () => {
  it('should call searchHandler for /api/search GET', async () => {
    const req = { url: '/api/search?q=test', method: 'GET', headers: { host: 'localhost:3000' } };
    const res = { writeHead: vi.fn(), end: vi.fn() };

    await router(req, res);

    expect(res.end).toHaveBeenCalledWith('mocked');
  });

  it('should return Not Found for unknown route', async () => {
    const req = { url: '/unknown', method: 'GET', headers: { host: 'localhost:3000' } };
    const res = { writeHead: vi.fn(), end: vi.fn() };

    await router(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Not Found');
  });

  it('should return Not Found for incorrect method', async () => {
    const req = { url: '/api/search?q=test', method: 'Post', headers: { host: 'localhost:3000' } };
    const res = { writeHead: vi.fn(), end: vi.fn() };

    await router(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(404, { 'Content-Type': 'text/plain' });
    expect(res.end).toHaveBeenCalledWith('Not Found');
  });
});
