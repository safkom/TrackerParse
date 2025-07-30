<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# TrackerHub Web App Instructions

This is a React/Next.js web application that functions like trackerhub.cx. It parses Google Docs spreadsheets containing artist information and displays albums and tracks with caching.

## Project Structure
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **JSON caching system** for parsed spreadsheets

## Key Features
1. **Google Docs Parser**: Extracts artist, album, and track information from Google Docs links
2. **Artist Display**: Shows artist info with albums (name, picture, description)
3. **Track Details**: Displays track info including Era, Name, Link, Notes, Discord link, Track Length, File Date, Leak Date, Available Length, Quality, and Link(s)
4. **Caching System**: Saves parsed spreadsheets as JSON for faster subsequent loads

## Data Structure
Each track should contain these fields:
- Era
- Name
- Link to google doc
- Notes
- Discord link
- Track Length
- File Date
- Leak Date
- Available Length
- Quality
- Link(s)

## Code Guidelines
- Use TypeScript interfaces for all data structures
- Implement proper error handling for Google Docs parsing
- Use React hooks for state management
- Implement responsive design with Tailwind CSS
- Cache parsed data in JSON format for performance
- Follow Next.js best practices for API routes and components
