import fs from 'fs/promises';
import path from 'path';
import { Artist, CachedData, CachedArtist, CacheMetadata } from '@/types';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'parsed-docs.json');

export class CacheManager {
  // Ensure cache directory exists
  static async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(CACHE_DIR);
    } catch {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  }

  // Load cached data
  static async loadCache(): Promise<CachedData> {
    try {
      await this.ensureCacheDir();
      const data = await fs.readFile(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Return empty cache if file doesn't exist or is invalid
      return {};
    }
  }

  // Save data to cache with metadata
  static async saveToCache(docId: string, artist: Artist, metadata: CacheMetadata): Promise<void> {
    try {
      await this.ensureCacheDir();
      const cache = await this.loadCache();
      const cachedArtist: CachedArtist = {
        ...artist,
        cacheMetadata: metadata
      };
      cache[docId] = cachedArtist;
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  // Get cached data for a document
  static async getCachedData(docId: string): Promise<CachedArtist | null> {
    try {
      const cache = await this.loadCache();
      return cache[docId] || null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // Check if cached data needs updating based on metadata
  static shouldUpdateCache(cachedArtist: CachedArtist, newMetadata: CacheMetadata): boolean {
    const cached = cachedArtist.cacheMetadata;
    
    // Check if ETag has changed (most reliable)
    if (cached.etag && newMetadata.etag && cached.etag !== newMetadata.etag) {
      return true;
    }
    
    // Check if Last-Modified has changed
    if (cached.lastModified && newMetadata.lastModified && cached.lastModified !== newMetadata.lastModified) {
      return true;
    }
    
    // Check if content length has changed
    if (cached.contentLength && newMetadata.contentLength && cached.contentLength !== newMetadata.contentLength) {
      return true;
    }
    
    // Fallback: check if cache is older than 5 minutes (for frequent updates)
    const cacheAge = Date.now() - new Date(cached.fetchedAt).getTime();
    return cacheAge > (5 * 60 * 1000); // 5 minutes
  }

  // Check if cached data is fresh (less than 1 hour old)
  static isCacheFresh(artist: CachedArtist, maxAgeMinutes: number = 60): boolean {
    const lastUpdated = new Date(artist.lastUpdated);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diffMinutes < maxAgeMinutes;
  }

  // Clear cache for a specific document
  static async clearCache(docId: string): Promise<void> {
    try {
      const cache = await this.loadCache();
      delete cache[docId];
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Clear all cache
  static async clearAllCache(): Promise<void> {
    try {
      await this.ensureCacheDir();
      await fs.writeFile(CACHE_FILE, JSON.stringify({}, null, 2));
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }
}
