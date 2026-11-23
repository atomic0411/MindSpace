import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errors.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('errorHandler', () => {
  it('logs only safe error metadata for server errors', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const error = Object.assign(new Error('sensitive request content'), { code: 11000 });

    errorHandler(error, {
      method: 'POST',
      baseUrl: '/api/auth',
      route: { path: '/register' },
      body: { password: 'never-log-this' }
    }, response, vi.fn());

    expect(log).toHaveBeenCalledWith('API request failed', {
      method: 'POST',
      route: '/api/auth/register',
      errorName: 'Error',
      errorCode: 11000
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive request content');
    expect(JSON.stringify(log.mock.calls)).not.toContain('never-log-this');
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
