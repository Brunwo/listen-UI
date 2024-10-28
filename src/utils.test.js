import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkOnlineStatus, handleSharedUrl } from './utils';

describe('utils', () => {
  beforeEach(() => {
    global.navigator = { onLine: true };
    global.window = { location: { search: '' } };
    global.alert = vi.fn();
  });

  it('should check online status', () => {
    global.navigator.onLine = false;
    checkOnlineStatus();
    expect(alert).toHaveBeenCalledWith('You are currently offline. Some features may be limited.');
  });

  it('should handle shared URL', () => {
    global.window.location.search = '?url=https://example.com';
    const result = handleSharedUrl();
    expect(result).toBe('https://example.com');
  });
});