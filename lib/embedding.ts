let extractorInstance: any = null;

async function getExtractor() {
  if (!extractorInstance) {
    const { pipeline, env } = await import('@xenova/transformers');
    // Configure cache directory to be local to the project
    env.cacheDir = './.cache';
    extractorInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorInstance;
}

/**
 * Generates a 384-dimensional vector embedding for the given text.
 * Falls back to a zero vector on failure to avoid blocking app functionality.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return new Array(384).fill(0);
  }

  try {
    const extractor = await getExtractor();
    const output = await extractor(cleanText, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data);
  } catch (error) {
    return new Array(384).fill(0);
  }
}
