/**
 * Request Queue and Batching System for Mobile Performance
 * Prevents multiple concurrent requests from overwhelming the network
 */

interface QueuedRequest {
  url: string;
  options?: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason: any) => void;
  priority: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly maxConcurrent = 3; // Limit concurrent requests for mobile
  private activeRequests = 0;
  private requestCache = new Map<string, Promise<Response>>();
  private readonly cacheTimeout = 30000; // 30 seconds cache

  /**
   * Add a request to the queue with deduplication
   */
  async enqueue(url: string, options?: RequestInit, priority = 0): Promise<Response> {
    // Check cache first
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)!;
    }

    // Create new request promise
    const requestPromise = new Promise<Response>((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject, priority });
      this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
      this.processQueue();
    });

    // Cache the promise
    this.requestCache.set(cacheKey, requestPromise);
    setTimeout(() => this.requestCache.delete(cacheKey), this.cacheTimeout);

    return requestPromise;
  }

  /**
   * Process the request queue
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift()!;
      this.activeRequests++;

      this.executeRequest(request)
        .finally(() => {
          this.activeRequests--;
          this.processQueue();
        });
    }

    this.processing = false;
  }

  /**
   * Execute a single request
   */
  private async executeRequest(request: QueuedRequest) {
    try {
      const response = await fetch(request.url, {
        ...request.options,
        signal: AbortSignal.timeout(8000), // 8 second timeout for mobile
      });
      request.resolve(response);
    } catch (error) {
      request.reject(error);
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.requestCache.clear();
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      cacheSize: this.requestCache.size,
    };
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue();

/**
 * Optimized fetch wrapper that uses the request queue
 */
export async function queuedFetch(url: string, options?: RequestInit, priority = 0): Promise<Response> {
  return requestQueue.enqueue(url, options, priority);
}

/**
 * Batch multiple requests with intelligent prioritization
 */
export async function batchRequests<T>(
  requests: Array<{
    url: string;
    options?: RequestInit;
    priority?: number;
    transform?: (response: Response) => Promise<T>;
  }>
): Promise<(T | null)[]> {
  const promises = requests.map(async (req) => {
    try {
      const response = await requestQueue.enqueue(req.url, req.options, req.priority || 0);
      return req.transform ? req.transform(response) : response as unknown as T;
    } catch (error) {
      console.error('Request failed:', error);
      return null;
    }
  });

  return Promise.allSettled(promises).then(results =>
    results.map(result =>
      result.status === 'fulfilled' ? result.value : null
    )
  );
}
