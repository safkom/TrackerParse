import fs from 'fs/promises';
import path from 'path';
import { Artist } from '@/types';

export interface TrackerExport {
  trackerName: string;
  docId: string;
  sourceUrl: string;
  lastUpdated: string;
  hasUpdatesPage: boolean;
  hasStatisticsPage: boolean;
  artist: Artist;
  metadata: {
    totalTracks: number;
    totalAlbums: number;
    exportVersion: string;
  };
}

export class JSONExporter {
  private static EXPORT_DIR = path.join(process.cwd(), process.env.EXPORT_DIR || 'exports');
  
  // Ensure export directory exists
  static async ensureExportDir(): Promise<void> {
    try {
      await fs.access(this.EXPORT_DIR);
    } catch {
      await fs.mkdir(this.EXPORT_DIR, { recursive: true });
    }
  }

  // Export tracker data to JSON
  static async exportToJSON(
    docId: string,
    sourceUrl: string,
    artist: Artist,
    hasUpdatesPage: boolean = true,
    hasStatisticsPage: boolean = true
  ): Promise<string> {
    await this.ensureExportDir();
    
    const exportData: TrackerExport = {
      trackerName: artist.name,
      docId,
      sourceUrl,
      lastUpdated: new Date().toISOString(),
      hasUpdatesPage,
      hasStatisticsPage,
      artist,
      metadata: {
        totalTracks: artist.albums.reduce((sum, album) => sum + album.tracks.length, 0),
        totalAlbums: artist.albums.length,
        exportVersion: '2.0'
      }
    };

    const fileName = `${docId}.json`;
    const filePath = path.join(this.EXPORT_DIR, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    console.log(`Exported tracker data to ${filePath}`);
    return filePath;
  }

  // Load tracker data from JSON
  static async loadFromJSON(docId: string): Promise<TrackerExport | null> {
    try {
      const filePath = path.join(this.EXPORT_DIR, `${docId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as TrackerExport;
    } catch (error) {
      console.log(`No export found for ${docId}:`, error);
      return null;
    }
  }

  // Check if export exists and is recent
  static async isExportFresh(docId: string, maxAgeMinutes: number = 30): Promise<boolean> {
    try {
      const exportData = await this.loadFromJSON(docId);
      if (!exportData) return false;
      
      const lastUpdated = new Date(exportData.lastUpdated);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
      
      return diffMinutes < maxAgeMinutes;
    } catch {
      return false;
    }
  }

  // Get all exported trackers
  static async getAllExports(): Promise<TrackerExport[]> {
    try {
      await this.ensureExportDir();
      const files = await fs.readdir(this.EXPORT_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const exports: TrackerExport[] = [];
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.EXPORT_DIR, file);
          const data = await fs.readFile(filePath, 'utf-8');
          exports.push(JSON.parse(data));
        } catch (error) {
          console.error(`Error loading export ${file}:`, error);
        }
      }
      
      return exports;
    } catch {
      return [];
    }
  }

  // Clean old exports
  static async cleanOldExports(maxAgeHours: number = 24): Promise<void> {
    try {
      await this.ensureExportDir();
      const files = await fs.readdir(this.EXPORT_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.EXPORT_DIR, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Cleaned old export: ${file}`);
          }
        } catch (error) {
          console.error(`Error cleaning export ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('Error cleaning old exports:', error);
    }
  }
}
