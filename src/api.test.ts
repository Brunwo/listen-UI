import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMp3 } from './api';
import { Client } from "@gradio/client";

vi.mock("@gradio/client");

describe('api', () => {
  beforeEach(() => {
    global.navigator = { onLine: true } as any;
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn()
    } as any;
    global.document = {
      getElementById: vi.fn().mockReturnValue({
        style: { display: 'none' },
        src: ''
      })
    } as any;
    (Client.connect as any) = vi.fn().mockResolvedValue({
      predict: vi.fn().mockResolvedValue({
        data: [{ url: 'test.mp3' }, 'Test transcription']
      })
    });
  });

  it('should fetch MP3 from API', async () => {
    (localStorage.getItem as any) = vi.fn().mockReturnValue('test-api-key');
    await fetchMp3('https://example.com');
    expect(Client.connect).toHaveBeenCalled();
  });

  it('should handle offline state', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true
    });
    global.alert = vi.fn();
    await fetchMp3('https://example.com');
    expect(alert).toHaveBeenCalledWith('You are offline. Unable to fetch new audio.');
  });
});
