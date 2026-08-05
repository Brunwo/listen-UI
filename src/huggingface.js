/**
 * Hugging Face API client for semantic search and inference endpoints
 */
class HuggingFaceClient {
  constructor() {
    this.apiKey = localStorage.getItem('hf_api_key') || '';
    this.endpointUrl = localStorage.getItem('hf_endpoint_url') || '';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('hf_api_key', apiKey);
    this.init();
  }

  setEndpointUrl(url) {
    this.endpointUrl = url;
    localStorage.setItem('hf_endpoint_url', url);
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
    if (!this.endpointUrl) {
      throw new Error('Inference endpoint URL not configured');
    }

    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    const response = await fetch(this.endpointUrl, {
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
    if (!this.endpointUrl) {
      throw new Error('Inference endpoint URL not configured');
    }

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