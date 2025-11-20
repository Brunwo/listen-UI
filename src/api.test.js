import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMp3 } from './api';
import { Client } from "@gradio/client";

vi.mock("@gradio/client");

describe('api', () => {
  beforeEach(() => {
    global.navigator = { onLine: true };
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    };
    global.document = {
      getElementById: vi.fn().mockReturnValue({
        style: { display: 'none' },
        src: ''
      })
    };
    global.caches = {
      open: vi.fn().mockResolvedValue({
        add: vi.fn(),
        match: vi.fn(),
        delete: vi.fn()
      })
    };
    Client.connect = vi.fn().mockResolvedValue({
      submit: vi.fn().mockReturnValue({
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            callback({ data: [{ url: 'http://example.com/test.mp3' }, 'Test transcription'] });
          }
          return { on: vi.fn() }; // Chainable
        }),
        catch: vi.fn().mockReturnThis(),
        then: vi.fn().mockReturnThis(),
        finally: vi.fn().mockReturnThis()
      }),
      predict: vi.fn().mockResolvedValue({
        data: [{ url: 'http://example.com/test.mp3' }, 'Test transcription']
      })
    });
  });

  it('should fetch MP3 from API', async () => {
    localStorage.getItem.mockReturnValue('test-api-key');
    await fetchMp3('https://example.com');
    expect(Client.connect).toHaveBeenCalled();
  });

  it('should handle offline state', async () => {
    global.navigator.onLine = false;
    await expect(fetchMp3('https://example.com')).rejects.toThrow('You are offline. Unable to fetch new audio.');
  });
});
