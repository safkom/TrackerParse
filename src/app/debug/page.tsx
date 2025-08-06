'use client';

import { useState } from 'react';

interface RawDataResponse {
  success: boolean;
  url?: string;
  rawData?: string;
  analysis?: {
    totalRows: number;
    nonEmptyRows: number;
    firstFewRows: string[][];
    columnCount: number;
    sampleData: Record<string, string[]>;
  };
  potentialHeaders?: Array<{
    rowIndex: number;
    row: string[];
    hasEra: boolean;
    hasName: boolean;
    confidence: number;
  }>;
  metadata?: {
    docId: string;
    gid: string;
    contentLength: number;
    contentType: string;
    timestamp: string;
  };
  error?: string;
}

interface DebugLog {
  step: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface DebugParseResponse {
  success: boolean;
  debugInfo?: {
    rowAnalysis: {
      totalRows: number;
      headerRowIndex: number;
      dataRowCount: number;
      processedRows: number;
      skippedRows: number;
      eraRows: number;
      trackRows: number;
    };
    headers: string[];
    columnMap: Record<string, number>;
    sampleRows: {
      firstFewRows: string[][];
      headerRow: string[];
      firstFewDataRows: string[][];
    };
  };
  debugLogs?: DebugLog[];
  error?: string;
}

export default function DebugPage() {
  const [url, setUrl] = useState('');
  const [rawData, setRawData] = useState<RawDataResponse | null>(null);
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'raw' | 'debug'>('raw');

  const fetchRawData = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDocsUrl: url })
      });
      
      const data = await response.json();
      setRawData(data);
    } catch (error) {
      console.error('Error fetching raw data:', error);
      setRawData({ success: false, error: 'Failed to fetch raw data' });
    }
    setLoading(false);
  };

  const fetchDebugData = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/debug/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDocsUrl: url })
      });
      
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      setDebugData({ success: false, error: 'Failed to fetch debug data' });
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Parser Debug Tools</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Google Sheets URL:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchRawData}
            disabled={loading || !url}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Get Raw Data
          </button>
          <button
            onClick={fetchDebugData}
            disabled={loading || !url}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Debug Parse
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'raw'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Data
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            className={`px-6 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'debug'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Debug Parse
          </button>
        </nav>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Fetching data...</p>
        </div>
      )}

      {/* Raw Data Tab */}
      {activeTab === 'raw' && rawData && (
        <div className="space-y-6">
          {rawData.error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{rawData.error}</p>
            </div>
          ) : (
            <>
              {/* Metadata */}
              {rawData.metadata && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Doc ID:</strong> {rawData.metadata.docId}</div>
                    <div><strong>GID:</strong> {rawData.metadata.gid}</div>
                    <div><strong>Content Length:</strong> {rawData.metadata.contentLength.toLocaleString()} bytes</div>
                    <div><strong>Content Type:</strong> {rawData.metadata.contentType}</div>
                  </div>
                </div>
              )}

              {/* Analysis */}
              {rawData.analysis && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div><strong>Total Rows:</strong> {rawData.analysis.totalRows}</div>
                    <div><strong>Non-empty Rows:</strong> {rawData.analysis.nonEmptyRows}</div>
                    <div><strong>Max Columns:</strong> {rawData.analysis.columnCount}</div>
                  </div>
                  
                  <h4 className="font-medium mb-2">First Few Rows:</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-300">
                      <tbody>
                        {rawData.analysis.firstFewRows.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1 border font-medium">Row {i}</td>
                            {row.slice(0, 6).map((cell, j) => (
                              <td key={j} className="px-2 py-1 border max-w-32 truncate">
                                {cell || '(empty)'}
                              </td>
                            ))}
                            {row.length > 6 && <td className="px-2 py-1 border text-gray-500">... +{row.length - 6} more</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Potential Headers */}
              {rawData.potentialHeaders && rawData.potentialHeaders.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Potential Header Rows</h3>
                  {rawData.potentialHeaders.map((header, i) => (
                    <div key={i} className="mb-3 p-3 bg-white rounded border">
                      <div className="flex gap-4 text-sm mb-2">
                        <span><strong>Row {header.rowIndex}</strong></span>
                        <span>Era: {header.hasEra ? '✓' : '✗'}</span>
                        <span>Name: {header.hasName ? '✓' : '✗'}</span>
                        <span>Confidence: {header.confidence}%</span>
                      </div>
                      <div className="text-xs text-gray-600 font-mono">
                        [{header.row.slice(0, 5).join(', ')}]
                        {header.row.length > 5 && <span className="text-gray-400"> ... +{header.row.length - 5} more</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw CSV Data */}
              {rawData.rawData && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Raw CSV Data (Preview)</h3>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                    {rawData.rawData}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Debug Parse Tab */}
      {activeTab === 'debug' && debugData && (
        <div className="space-y-6">
          {debugData.error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-700">{String(debugData.error)}</p>
            </div>
          ) : (
            <>
              {/* Debug Info */}
              {debugData.debugInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Parse Analysis</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                    <div><strong>Total Rows:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.totalRows || 'N/A'}</div>
                    <div><strong>Header Row:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.headerRowIndex || 'N/A'}</div>
                    <div><strong>Data Rows:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.dataRowCount || 'N/A'}</div>
                    <div><strong>Processed:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.processedRows || 'N/A'}</div>
                    <div><strong>Skipped:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.skippedRows || 'N/A'}</div>
                    <div><strong>Era Rows:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.eraRows || 'N/A'}</div>
                    <div><strong>Track Rows:</strong> {(debugData.debugInfo as any)?.rowAnalysis?.trackRows || 'N/A'}</div>
                  </div>
                  
                  <h4 className="font-medium mb-2">Column Mapping:</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {debugData.debugInfo && Object.entries((debugData.debugInfo as any)?.columnMap || {}).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}:</strong> {typeof value === 'number' && value >= 0 ? `Column ${value}` : 'Not found'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Debug Logs */}
              {debugData.debugLogs && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold mb-2">Debug Logs</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {(debugData.debugLogs as any[])?.map((log: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded border text-sm">
                        <div className="flex gap-2 items-center mb-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {log.step}
                          </span>
                          <span className="text-gray-500 text-xs">{log.timestamp}</span>
                        </div>
                        <div className="font-medium mb-1">{log.message}</div>
                        {log.data && (
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
