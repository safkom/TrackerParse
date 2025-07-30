import fs from 'fs/promises';
import path from 'path';
import { Artist, CachedData } from '@/types';

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
    } catch (error) {
      // Return empty cache if file doesn't exist or is invalid
      return {};
    }
  }

  // Save data to cache
  static async saveToCache(docId: string, artist: Artist): Promise<void> {
    try {
      await this.ensureCacheDir();
      const cache = await this.loadCache();
      cache[docId] = artist;
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  // Get cached data for a document
  static async getCachedData(docId: string): Promise<Artist | null> {
    try {
      const cache = await this.loadCache();
      return cache[docId] || null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }

  // Check if cached data is fresh (less than 1 hour old)
  static isCacheFresh(artist: Artist, maxAgeMinutes: number = 60): boolean {
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
