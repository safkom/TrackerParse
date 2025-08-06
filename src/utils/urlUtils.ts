/**
 * Utility functions for handling Google Sheets URLs and document IDs
 */

/**
 * Reconstructs a Google Sheets URL from a document ID that may include GID
 * @param docId Document ID, possibly with GID suffix (e.g., "docId_gid_12345")
 * @returns Properly formatted Google Sheets URL
 */
export function reconstructGoogleSheetsUrl(docId: string): string {
  if (docId.includes('_gid_')) {
    // Extract actual docId and GID
    const parts = docId.split('_gid_');
    const actualDocId = parts[0];
    const gid = parts[1];
    return `https://docs.google.com/spreadsheets/d/${actualDocId}/edit#gid=${gid}`;
  } else {
    return `https://docs.google.com/spreadsheets/d/${docId}/edit`;
  }
}

/**
 * Extracts the base document ID (without GID) from a document ID string
 * @param docId Document ID, possibly with GID suffix
 * @returns Base document ID without GID
 */
export function getBaseDocumentId(docId: string): string {
  return docId.split('_gid_')[0];
}

/**
 * Extracts the GID from a document ID string
 * @param docId Document ID, possibly with GID suffix
 * @returns GID number or null if no GID present
 */
export function getGidFromDocId(docId: string): string | null {
  const parts = docId.split('_gid_');
  return parts.length > 1 ? parts[1] : null;
}
