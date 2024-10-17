import { describe, it, expect, vi } from 'vitest';
import { checkOnlineStatus, handleSharedUrl } from './utils';

describe('utils', () => {
  it('should check online status', () => {
    global.navigator = { onLine: false } as any;
    global.alert = vi.fn();
    checkOnlineStatus();
    expect(alert).toHaveBeenCalledWith('You are currently offline. Some features may be limited.');
  });

  it('should handle shared URL', () => {
    global.window = { location: { search: '?url=https://example.com' } } as any;
    const result = handleSharedUrl();
    expect(result).toBe('https://example.com');
  });
});