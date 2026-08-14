import { describe, it, expect, vi, beforeEach } from 'vitest';
import huggingfaceClient, { DEFAULT_HF_ENDPOINT_URL } from './huggingface';

describe('DEFAULT_HF_ENDPOINT_URL', () => {
  it('is a non-empty https URL (free embedding endpoint)', () => {
    expect(DEFAULT_HF_ENDPOINT_URL).toBeTruthy();
    expect(DEFAULT_HF_ENDPOINT_URL.startsWith('https://')).toBe(true);
  });
});

describe('getEffectiveEndpointUrl', () => {
  beforeEach(() => {
    huggingfaceClient.endpointUrl = '';
  });

  it('falls back to the default endpoint when none is configured', () => {
    expect(huggingfaceClient.getEffectiveEndpointUrl()).toBe(DEFAULT_HF_ENDPOINT_URL);
  });

  it('prefers a configured custom endpoint', () => {
    huggingfaceClient.endpointUrl = 'https://custom.example.com/v1';
    expect(huggingfaceClient.getEffectiveEndpointUrl()).toBe('https://custom.example.com/v1');
  });
});

describe('smokeTest (whoami)', () => {
  beforeEach(() => {
    huggingfaceClient.apiKey = '';
    global.fetch = vi.fn();
  });

  it('throws when no API key/token is configured', async () => {
    await expect(huggingfaceClient.smokeTest()).rejects.toThrow(
      'Hugging Face API key not configured'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when the token is rejected by the Hub', async () => {
    huggingfaceClient.apiKey = 'hf_invalid';
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    await expect(huggingfaceClient.smokeTest()).rejects.toThrow(
      'Hugging Face token rejected (HTTP 401)'
    );
  });

  it('returns the whoami payload for a valid token, with Bearer auth', async () => {
    huggingfaceClient.apiKey = 'hf_valid';
    const payload = { name: 'bruno', type: 'user' };
    global.fetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(payload) });

    await expect(huggingfaceClient.smokeTest()).resolves.toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://huggingface.co/api/whoami-v2',
      expect.objectContaining({ headers: { Authorization: 'Bearer hf_valid' } })
    );
  });
});

describe('testConnection', () => {
  beforeEach(() => {
    huggingfaceClient.apiKey = '';
    huggingfaceClient.endpointUrl = '';
    global.fetch = vi.fn();
  });

  it('reports tokenValid and endpointTested when both succeed', async () => {
    huggingfaceClient.apiKey = 'hf_valid';
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ name: 'bruno' }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([[0.1, 0.2]]) });

    const result = await huggingfaceClient.testConnection('https://custom.example.com/v1');

    expect(result).toEqual({
      tokenValid: true,
      user: 'bruno',
      endpointTested: true,
      endpointUrl: 'https://custom.example.com/v1'
    });
  });

  it('still succeeds with a valid token when the endpoint is unreachable (non-fatal)', async () => {
    huggingfaceClient.apiKey = 'hf_valid';
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ name: 'bruno' }) })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await huggingfaceClient.testConnection('https://custom.example.com/v1');

    expect(result.tokenValid).toBe(true);
    expect(result.endpointTested).toBe(false);
    expect(result.endpointUrl).toBe('https://custom.example.com/v1');
  });

  it('reports endpoint not verified when the endpoint returns an HTTP error', async () => {
    huggingfaceClient.apiKey = 'hf_valid';
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ name: 'bruno' }) })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await huggingfaceClient.testConnection('https://custom.example.com/v1');

    expect(result.tokenValid).toBe(true);
    expect(result.endpointTested).toBe(false);
  });

  it('defaults to the built-in endpoint URL when none is passed', async () => {
    huggingfaceClient.apiKey = 'hf_valid';
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ name: 'bruno' }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue([[0.1]]) });

    const result = await huggingfaceClient.testConnection();

    expect(result.endpointUrl).toBe(DEFAULT_HF_ENDPOINT_URL);
    expect(global.fetch.mock.calls[1][0]).toBe(DEFAULT_HF_ENDPOINT_URL);
  });

  it('propagates a token failure (no endpoint check attempted)', async () => {
    huggingfaceClient.apiKey = 'hf_invalid';
    global.fetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(huggingfaceClient.testConnection()).rejects.toThrow(
      'Hugging Face token rejected (HTTP 401)'
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('setters persist to localStorage', () => {
  it('setApiKey stores the key under hf_api_key', () => {
    huggingfaceClient.setApiKey('hf_x');
    expect(localStorage.getItem('hf_api_key')).toBe('hf_x');
  });

  it('setEndpointUrl stores the URL under hf_endpoint_url', () => {
    huggingfaceClient.setEndpointUrl('https://e.example.com');
    expect(localStorage.getItem('hf_endpoint_url')).toBe('https://e.example.com');
  });
});

describe('constructor', () => {
  it('falls back to hf_token when hf_api_key is absent (token-only save)', async () => {
    localStorage.clear();
    localStorage.setItem('hf_token', 'hf_token_only');
    localStorage.removeItem('hf_api_key');

    vi.resetModules();
    const mod = await import('./huggingface');

    expect(mod.default.apiKey).toBe('hf_token_only');
  });
});
