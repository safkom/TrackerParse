# 🎵 TrackerParse

> **A modern, feature-rich web application for parsing and displaying music tracker spreadsheets**

[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

### 🎧 **Music Tracker Parsing**
- **Google Docs Integration**: Parse spreadsheets directly from Google Docs links
- **Smart Data Extraction**: Automatically extracts artist, album, and track information
- **Multiple Sheet Support**: Handle different sheet types (unreleased, best tracks, etc.)
- **Intelligent Caching**: JSON-based caching system for faster subsequent loads

### 🎼 **Track Management**
- **Comprehensive Track Data**: Era, Name, Links, Notes, Discord links, Track Length, File Date, Leak Date, Available Length, Quality
- **Special Track Markers**: Support for 🏆, ✨, ⭐ special track indicators
- **Advanced Search**: Search across track titles, alternate names, features, collaborators, and notes
- **Track Grouping**: Intelligent grouping of track versions and variants

### 🎵 **Music Playback**
- **Multi-Platform Support**: 
  - 🎧 **Pillowcase API** (pillows.su, pillowcase.su, pillowcases.su, pillowcases.top)
  - 🌧️ **Music.froste.lol** (with automatic `/download` URL transformation)
  - 📺 **YouTube** (with audio extraction)
  - 🎶 **SoundCloud**
  - 🔗 **Direct Audio Files** (MP3, WAV, M4A, AAC, OGG, FLAC)
- **Seamless Integration**: Click-to-play functionality throughout the interface
- **Background Playback**: Persistent music player with controls

### 🌙 **User Experience**
- **Dark/Light Mode**: Automatic theme detection with manual toggle
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Keyboard Shortcuts**: Quick search with Ctrl/Cmd+K
- **Performance Optimized**: Debounced search, virtualized lists for large datasets

### 📊 **Data Export**
- **JSON Export**: Complete data structure with metadata for programmatic use
- **CSV Export**: Flattened track data compatible with Excel/Google Sheets
- **Flexible Options**: Choose export format, include/exclude metadata
- **Smart Filename Generation**: Automatic naming with artist, document ID, and date

### 🔍 **Advanced Features**
- **Metadata Integration**: Rich track metadata from Pillowcase API
- **Statistics Pages**: Comprehensive analytics and track statistics
- **Update Tracking**: Monitor changes and additions to trackers
- **Diagnostic Tools**: Built-in debugging and analysis tools

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/safkom/TrackerParse.git
cd TrackerParse

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. **Enter a Google Docs Spreadsheet ID** or paste a full Google Docs URL
2. **Browse the parsed data** - view artists, eras, and tracks
3. **Search and filter** tracks using the search bar
4. **Play music** directly from supported platforms
5. **Export data** in JSON or CSV format
6. **Toggle themes** using the light/dark mode button

## 🎯 API Endpoints

### Core APIs
- `GET /api/parse?docId={id}` - Parse Google Docs spreadsheet
- `GET /api/export?docId={id}&format={json|csv}` - Export parsed data
- `GET /api/search?query={term}` - Search across cached data

### Utility APIs
- `GET /api/youtube-audio?url={url}` - Extract audio from YouTube
- `GET /api/proxy-metadata?url={url}` - Proxy metadata requests
- `GET /api/debug` - Debug information and diagnostics

## 🛠️ Technology Stack

- **⚡ Next.js 15** - React framework with App Router
- **🔷 TypeScript** - Type-safe development
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **⚛️ React 18** - Modern React with hooks and contexts
- **🌐 Google Docs API** - Spreadsheet parsing
- **🎵 Multi-Platform Audio** - Support for various music platforms

## 📝 Data Structure

### Track Object
```typescript
interface Track {
  id: string;
  era: string;
  title: TrackTitle;
  rawName: string;
  notes: string;
  discordLink?: string;
  trackLength: string;
  fileDate: string;
  leakDate: string;
  availableLength: string;
  quality: string;
  links: TrackLink[];
  isSpecial: boolean;
  specialType?: '🏆' | '✨' | '⭐';
}
```

### Export Formats

**JSON Export** - Complete data structure:
```json
{
  "trackerName": "Artist Name",
  "docId": "spreadsheet_id",
  "sourceUrl": "https://docs.google.com/spreadsheets/d/...",
  "artist": { /* Complete artist data */ },
  "metadata": { /* Export statistics */ }
}
```

**CSV Export** - Flattened track data with columns:
- Basic: `trackerName`, `era`, `trackName`, `quality`, `trackLength`
- Metadata: `features`, `collaborators`, `producers`, `references`
- Links: `links` (JSON-encoded), `discordLink`
- Dates: `fileDate`, `leakDate`, `availableLength`

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Environment Configuration

Create `.env.local` for local development:
```env
# Optional: Custom cache directory
CACHE_DIR=./cache

# Optional: Debug mode
DEBUG=true
```

## 🎨 Customization

### Theme Configuration
The application supports light/dark mode with automatic system preference detection. Customize themes in `src/contexts/ThemeContext.tsx`.

### Adding Music Platforms
To add support for new music platforms, update:
1. `src/components/MusicPlayer.tsx` - Add platform detection and URL handling
2. `src/components/Track.tsx` - Update playability logic
3. `src/components/CollapsedTrack.tsx` - Update playability logic

### Parser Extensions
Extend the Google Docs parser in `src/utils/googleDocsParser.ts` to support additional spreadsheet formats or data structures.

## 📊 Features in Detail

### Smart Search
- **Multi-field search**: Search across track titles, alternate names, features, collaborators, producers, and notes
- **Era filtering**: Search within specific eras or across all content
- **Real-time results**: Debounced search with instant feedback
- **Keyboard shortcuts**: Quick access with Ctrl/Cmd+K

### Music Platform Integration
- **Pillowcase**: Full API integration with metadata support
- **Music.froste.lol**: Automatic URL transformation for direct downloads
- **YouTube**: Audio extraction via custom API
- **SoundCloud**: Direct embedding support
- **Direct files**: Support for common audio formats

### Export System
- **Format flexibility**: Choose between JSON (complete) or CSV (spreadsheet-compatible)
- **Metadata options**: Include/exclude export metadata and timestamps
- **Smart naming**: Automatic filename generation with context
- **Browser downloads**: Client-side download generation

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write comprehensive type definitions
- Add JSDoc comments for complex functions
- Test across different spreadsheet formats

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - Amazing React framework
- **Tailwind CSS** - Incredible utility-first CSS
- **Music Platform APIs** - Enabling seamless audio integration
- **Open Source Community** - Inspiration and tools

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/safkom/TrackerParse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/safkom/TrackerParse/discussions)

---

<div align="center">

**Built with ❤️ for the music tracking community**

[🌟 Star this repository](https://github.com/safkom/TrackerParse) if you find it useful!

</div>
