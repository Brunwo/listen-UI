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
    Client.connect = vi.fn().mockResolvedValue({
      predict: vi.fn().mockResolvedValue({
        data: [{ url: 'test.mp3' }, 'Test transcription']
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
    global.alert = vi.fn();
    await fetchMp3('https://example.com');
    expect(alert).toHaveBeenCalledWith('You are offline. Unable to fetch new audio.');
  });
});