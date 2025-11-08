/**
 * Embedding utilities for getting semantic embeddings
 *
 * Uses Hugging Face Inference API (free tier available)
 * No need to load models on serverless functions!
 */

const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

/**
 * Get embedding for a text using Hugging Face Inference API
 *
 * @param text - Text to embed
 * @param apiKey - Hugging Face API key (optional for public models, rate-limited)
 * @returns Embedding vector
 */
export async function getEmbedding(text: string, apiKey?: string): Promise<number[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add API key if provided (gets higher rate limits)
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: text.toLowerCase().trim(),
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      // If model is loading, retry once after a delay
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return getEmbedding(text, apiKey);
      }
      throw new Error(`HF API error: ${response.status} ${response.statusText}`);
    }

    const embedding = await response.json();

    // HF API returns array, we want the first element
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      return embedding[0];
    }

    return embedding;
  } catch (error) {
    console.error('Error getting embedding from HF:', error);
    throw error;
  }
}

/**
 * Get embeddings for multiple texts (batch)
 */
export async function getEmbeddingsBatch(texts: string[], apiKey?: string): Promise<number[][]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: texts.map(t => t.toLowerCase().trim()),
        options: {
          wait_for_model: true,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return getEmbeddingsBatch(texts, apiKey);
      }
      throw new Error(`HF API error: ${response.status}`);
    }

    const embeddings = await response.json();
    return embeddings;
  } catch (error) {
    console.error('Error getting embeddings from HF:', error);
    throw error;
  }
}

/**
 * Check if HF API is available (for health checks)
 */
export async function checkHFApiHealth(apiKey?: string): Promise<boolean> {
  try {
    await getEmbedding('test', apiKey);
    return true;
  } catch (error) {
    return false;
  }
}
