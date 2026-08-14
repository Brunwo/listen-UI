/**
 * Hugging Face API client for semantic search and inference endpoints
 */

/**
 * Default free text-embedding endpoint (HF Inference free tier).
 * Works with any valid HF token — no dedicated inference endpoint required.
 */
export const DEFAULT_HF_ENDPOINT_URL =
  'https://api-inference.huggingface.co/models/mixedbread-ai/mxbai-embed-large-v1';

class HuggingFaceClient {
  constructor() {
    this.apiKey =
      localStorage.getItem('hf_api_key') || localStorage.getItem('hf_token') || '';
    this.endpointUrl = localStorage.getItem('hf_endpoint_url') || '';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('hf_api_key', apiKey);
  }

  setEndpointUrl(url) {
    this.endpointUrl = url;
    localStorage.setItem('hf_endpoint_url', url);
  }

  /**
   * Resolve the endpoint to use: a custom configured endpoint if set,
   * otherwise the free default embedding endpoint.
   * @returns {string}
   */
  getEffectiveEndpointUrl() {
    return this.endpointUrl || DEFAULT_HF_ENDPOINT_URL;
  }

  /**
   * Smoke test: verify the HF token against the Hub API (whoami).
   * Works with just an API key/token — no endpoint required.
   * @returns {Promise<Object>} The whoami-v2 user/org payload.
   */
  async smokeTest() {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Hugging Face token rejected (HTTP ${response.status})`);
    }

    return await response.json();
  }

  /**
   * Full connection test:
   * 1. Validate the token against the Hub API (smoke test).
   * 2. If an endpoint is available (custom or default), POST an embedding to verify it.
   * The token result is the primary signal; an unreachable endpoint is reported,
   * not fatal, so a plain token check still succeeds.
   * @param {string} [endpointUrl] - Optional endpoint to test (uses custom/default otherwise).
   * @returns {Promise<{tokenValid: boolean, user: string, endpointTested: boolean, endpointUrl: string}>}
   */
  async testConnection(endpointUrl) {
    const userInfo = await this.smokeTest();
    const url = endpointUrl || this.getEffectiveEndpointUrl();
    let endpointTested = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: 'test' }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        console.warn('HF endpoint embedding check failed:', `HTTP ${response.status}`);
      } else {
        await response.json();
        endpointTested = true;
      }
    } catch (err) {
      console.warn('HF endpoint embedding check failed:', err.message);
    }

    return {
      tokenValid: true,
      user: userInfo?.name || userInfo?.org || 'validated',
      endpointTested,
      endpointUrl: url
    };
  }

  /**
   * Search for models using Hugging Face API
   * @param {string} query - Search query
   * @param {Object} filters - Optional filters
   */
  async searchModels(query, filters = {}) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const params = new URLSearchParams({
      search: query,
      ...filters
    });

    const response = await fetch(
      `https://huggingface.co/api/models?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search models: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search for Spaces using Hugging Face API
   * @param {string} query - Search query
   */
  async searchSpaces(query) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const params = new URLSearchParams({
      search: query
    });

    const response = await fetch(
      `https://huggingface.co/api/spaces?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search spaces: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get model details
   * @param {string} modelId - Model identifier (e.g., "sentence-transformers/all-MiniLM-L6-v2")
   */
  async getModelDetails(modelId) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(
      `https://huggingface.co/api/models/${modelId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get model details: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Run inference on a model endpoint
   * @param {string} text - Input text for embedding
   */
  async getEmbedding(text) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(this.getEffectiveEndpointUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text })
    });

    if (!response.ok) {
      throw new Error(`Inference failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Semantic search over documents
   * @param {string} query - Search query
   * @param {Array} documents - Array of documents to search
   * @param {number} topK - Number of top results to return
   */
  async semanticSearch(query, documents, topK = 5) {
    // Get embeddings for query and documents
    const [queryEmbedding, docEmbeddings] = await Promise.all([
      this.getEmbedding(query),
      Promise.all(documents.map(doc => this.getEmbedding(doc.text || doc)))
    ]);

    // Calculate cosine similarity
    const similarities = docEmbeddings.map((docEmb, idx) => ({
      document: documents[idx],
      score: this.cosineSimilarity(queryEmbedding, docEmb)
    }));

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * List inference endpoints
   */
  async listInferenceEndpoints() {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(
      'https://huggingface.co/api/inference-endpoints',
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list endpoints: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Discover resources using semantic search (ARD MCP endpoint)
   * @param {string} query - Search query
   */
  async discover(query) {
    const response = await fetch('https://huggingface-hf-discover.hf.space/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: { text: query },
            pageSize: 10
          }
        },
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`Discovery failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.result?.content?.[0]?.text;
    if (content) {
      return JSON.parse(content);
    }
    return data;
  }
}

export default new HuggingFaceClient();