# TrackerParse

A web application similar to trackerhub.cx that parses Google Docs spreadsheets and displays artist information with albums and tracks. Features include caching for improved performance and a responsive React interface.

## Features

- **Google Docs Integration**: Parse publicly accessible Google Sheets containing artist/track data
- **Smart Caching**: JSON-based caching system to avoid re-parsing the same spreadsheets
- **Artist Display**: Clean, organized view of artists, albums, and tracks
- **Track Details**: Comprehensive track information including era, links, dates, quality, and more
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS
- **TypeScript**: Full type safety throughout the application

## Expected Data Structure

Your Google Sheets should contain the following columns:

- **Era**: Album or era name
- **Name**: Track name
- **Link to google doc**: Link to track document
- **Notes**: Additional track notes
- **Discord link**: Discord discussion link
- **Track Length**: Duration of the track
- **File Date**: Date the file was created
- **Leak Date**: Date the track was leaked
- **Available Length**: How much of the track is available
- **Quality**: Audio quality information
- **Link(s)**: Additional links (comma-separated)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd TrackerParse
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. Enter a Google Docs spreadsheet URL (must be publicly accessible)
2. Click "Parse Spreadsheet" to analyze the data
3. View organized artist, album, and track information
4. Use the "Force refresh" option to bypass cache when needed

## Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety and better development experience
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API requests
- **PapaParse**: CSV parsing library
- **Node.js**: Server-side runtime

## 🏗️ Architecture

### Parser Engine
TrackerParse uses **ImprovedParser** as the single, consolidated parsing engine that handles:

- **Multiple Input Formats**: CSV export URLs and JSON data
- **Intelligent Era Detection**: Prevents songs from being incorrectly classified as eras
- **Enhanced Track Parsing**: Extracts features, collaborators, producers, and alternate names
- **Quality Standardization**: Maps quality indicators (HQ → High Quality, CDQ → CD Quality)
- **Platform-Aware Link Categorization**: Detects Pillowcase, SoundCloud, YouTube, Spotify, etc.
- **Advanced Date Parsing**: Handles multiple date formats and relative dates
- **Rate Limiting & Retry Logic**: Robust error handling with exponential backoff
- **Configurable Column Mapping**: Adapts to different tracker formats automatically

### Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── parse/               # Main parsing endpoint
│   │   ├── parse-json/          # JSON data parsing endpoint
│   │   ├── cache/               # Cache management
│   │   ├── export/              # Data export functionality
│   │   └── ...
│   ├── [spreadsheetId]/         # Dynamic tracker pages
│   ├── best/                    # Best tracks page
│   ├── recent/                  # Recent tracks page
│   └── ...
├── components/                  # React components
├── utils/
│   ├── improvedParser.ts        # Main parsing engine ⭐
│   ├── googleDocsParser.ts      # Deprecated - use ImprovedParser
│   ├── cacheManager.ts          # Cache management
│   └── ...
└── types/                       # TypeScript definitions
```

## API Endpoints

### POST /api/parse
Parse a Google Docs spreadsheet URL

**Request Body:**
```json
{
  "googleDocsUrl": "https://docs.google.com/spreadsheets/d/...",
  "forceRefresh": false
}
```

**Response:**
```json
{
  "artist": {
    "id": "artist-123",
    "name": "Artist Name",
    "albums": [...],
    "lastUpdated": "2025-01-01T00:00:00.000Z"
  },
  "error": "Optional error message"
}
```

### GET /api/parse?docId=...
Retrieve cached data for a specific document ID

### POST /api/debug/raw
Get raw unparsed data from a Google Sheet for debugging

**Request Body:**
```json
{
  "googleDocsUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

**Response:**
```json
{
  "success": true,
  "rawData": "CSV content...",
  "analysis": {
    "totalRows": 150,
    "nonEmptyRows": 145,
    "firstFewRows": [...],
    "columnCount": 12
  },
  "potentialHeaders": [
    {
      "rowIndex": 2,
      "row": ["Era", "Name", "Links", ...],
      "hasEra": true,
      "hasName": true,
      "confidence": 100
    }
  ]
}
```

### POST /api/debug/parse
Get detailed parsing logs and step-by-step analysis

**Request Body:**
```json
{
  "googleDocsUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

**Response:**
```json
{
  "success": true,
  "debugInfo": {
    "rowAnalysis": {
      "totalRows": 150,
      "headerRowIndex": 2,
      "eraRows": 8,
      "trackRows": 135
    },
    "columnMap": {
      "era": 0,
      "name": 1,
      "links": 2
    }
  },
  "debugLogs": [
    {
      "step": "HEADER_FOUND",
      "message": "Found header row at index 2",
      "data": {...},
      "timestamp": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Debug Page
Visit `/debug` for an interactive debugging interface that allows you to:
- View raw CSV data from Google Sheets
- Analyze potential header rows
- See detailed parsing logs
- Understand how the parser classifies each row (era vs track)
- Examine column mapping and data processing

## Caching

The application uses a JSON-based caching system that:
- Stores parsed spreadsheet data locally
- Reduces API calls to Google Docs
- Provides fallback data when parsing fails
- Can be bypassed with the "Force refresh" option

Cache files are stored in the `cache/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Troubleshooting

### Common Issues

1. **"Access denied" error**: Ensure the Google Docs spreadsheet is publicly accessible
2. **"Invalid URL format"**: Make sure you're using a valid Google Sheets URL
3. **No data found**: Check that your spreadsheet has the expected column headers
4. **Parsing errors**: Verify your spreadsheet data format matches the expected structure

### Support

If you encounter any issues, please check the browser console for detailed error messages and ensure your Google Docs URL is correct and publicly accessible.
