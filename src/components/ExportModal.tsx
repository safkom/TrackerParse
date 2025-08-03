'use client';

import React, { useState } from 'react';
import { Artist } from '@/types';
import { DataExporter, ExportOptions } from '@/utils/dataExporter';

interface ExportModalProps {
  artist: Artist;
  docId: string;
  sourceUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  artist, 
  docId, 
  sourceUrl, 
  isOpen, 
  onClose 
}) => {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const exportSummary = DataExporter.getExportSummary(artist);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format: exportFormat,
        includeMetadata,
        flattenTracks: exportFormat === 'csv'
      };

      DataExporter.exportAndDownload(artist, docId, sourceUrl, options);
      
      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Export Tracker Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Export Summary */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Export Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600 dark:text-gray-300">
              Artist: <span className="font-medium text-gray-900 dark:text-white">{artist.name}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Eras: <span className="font-medium text-gray-900 dark:text-white">{exportSummary.totalEras}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Total Tracks: <span className="font-medium text-gray-900 dark:text-white">{exportSummary.totalTracks}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Special Tracks: <span className="font-medium text-gray-900 dark:text-white">{exportSummary.specialTracks}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              With Links: <span className="font-medium text-gray-900 dark:text-white">{exportSummary.tracksWithLinks}</span>
            </div>
            <div className="text-gray-600 dark:text-gray-300">
              Without Links: <span className="font-medium text-gray-900 dark:text-white">{exportSummary.tracksWithoutLinks}</span>
            </div>
          </div>
        </div>

        {/* Export Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="json"
                checked={exportFormat === 'json'}
                onChange={(e) => setExportFormat(e.target.value as 'json')}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-white">JSON</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Complete data structure, programmatic use)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value as 'csv')}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-white">CSV</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Flattened data, spreadsheet compatible)
              </span>
            </label>
          </div>
        </div>

        {/* Export Options */}
        {exportFormat === 'json' && (
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="mr-2"
              />
              <span className="text-gray-900 dark:text-white text-sm">Include metadata</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                (Export stats, timestamps, etc.)
              </span>
            </label>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </div>
            ) : (
              `Export ${exportFormat.toUpperCase()}`
            )}
          </button>
        </div>

        {/* Format Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-xs text-blue-700 dark:text-blue-300">
            {exportFormat === 'json' ? (
              <>
                <strong>JSON Export:</strong> Complete data structure including nested objects, arrays, and metadata. 
                Perfect for programmatic use, backup, or importing into other applications.
              </>
            ) : (
              <>
                <strong>CSV Export:</strong> Flattened track data with one row per track. 
                Compatible with Excel, Google Sheets, and database imports. Complex fields are JSON-encoded.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
