import axios, { AxiosInstance, AxiosError } from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

export class ApiClient {
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static axiosInstance: AxiosInstance;

  private static getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private static isCacheValid(timestamp: number): boolean {
    const ttl = parseInt(process.env.API_CACHE_TTL_MS || '300000', 10);
    return Date.now() - timestamp < ttl;
  }

  private static getFromCache<T>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return {
        success: true,
        data: cached.data,
        cached: true
      };
    }
    return null;
  }

  private static setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private static clearCache(): void {
    this.cache.clear();
  }

  private static getInstance(): AxiosInstance {
    if (!this.axiosInstance) {
      const timeout = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
      
      this.axiosInstance = axios.create({
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    }
    return this.axiosInstance;
  }

  private static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${backoffTime}ms...`);
        await this.sleep(backoffTime);
      }
    }
    
    throw lastError!;
  }

  static async get<T>(
    url: string,
    params: any = {},
    headers: any = {},
    useCache: boolean = true
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(url, params);
    
    // Check cache first
    if (useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.retryWithBackoff(async () => {
        return this.getInstance().get(url, {
          params,
          headers
        });
      });

      const data = response.data;
      
      // Validate response
      if (!this.validateResponse(data)) {
        throw new Error('Invalid API response structure');
      }

      // Cache the response
      if (useCache) {
        this.setCache(cacheKey, data);
      }

      return {
        success: true,
        data,
        cached: false
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = (axiosError.response?.data as any)?.message || 
                          axiosError.message || 
                          'API request failed';
      
      console.error('API GET request failed:', {
        url,
        params,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static async post<T>(
    url: string,
    data: any = {},
    headers: any = {},
    useCache: boolean = true
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey(url, data);
    
    // Check cache first
    if (useCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.retryWithBackoff(async () => {
        return this.getInstance().post(url, data, {
          headers
        });
      });

      const responseData = response.data;
      
      // Validate response
      if (!this.validateResponse(responseData)) {
        throw new Error('Invalid API response structure');
      }

      // Cache the response
      if (useCache) {
        this.setCache(cacheKey, responseData);
      }

      return {
        success: true,
        data: responseData,
        cached: false
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = (axiosError.response?.data as any)?.message || 
                          axiosError.message || 
                          'API request failed';
      
      console.error('API POST request failed:', {
        url,
        data,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private static validateResponse(data: any): boolean {
    // Basic validation - ensure response is not null/undefined
    if (data === null || data === undefined) {
      return false;
    }
    
    // Add more specific validation based on API requirements
    return true;
  }

  static clearAllCache(): void {
    this.clearCache();
  }
}
