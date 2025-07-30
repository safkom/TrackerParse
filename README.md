# TrackerHub

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
cd TrackerHub
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

## Project Structure

```
src/
├── app/
│   ├── api/parse/route.ts    # API endpoint for parsing Google Docs
│   └── page.tsx              # Main application page
├── components/
│   ├── Artist.tsx            # Artist display component
│   ├── Album.tsx             # Album display component
│   ├── Track.tsx             # Track display component
│   └── GoogleDocsForm.tsx    # URL input form
├── types/
│   └── index.ts              # TypeScript type definitions
└── utils/
    ├── googleDocsParser.ts   # Google Docs parsing logic
    └── cacheManager.ts       # Caching system
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
