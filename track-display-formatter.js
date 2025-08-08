#!/usr/bin/env node

/**
 * Track Display Formatter
 * Properly separates main titles, alt titles, and production info for clean display
 */

const fs = require('fs');
const path = require('path');

console.log('🎵 TRACK DISPLAY FORMATTER');
console.log('==========================');

// Load fresh parsed data
const parsedDataPath = path.join(__dirname, 'fresh_parsed_data.json');

if (!fs.existsSync(parsedDataPath)) {
  console.error('❌ fresh_parsed_data.json not found!');
  process.exit(1);
}

console.log('✅ Loading fresh parsed data...');
const parsedResponse = JSON.parse(fs.readFileSync(parsedDataPath, 'utf8'));
const albums = parsedResponse.artist?.albums || [];

/**
 * Clean and format track title information
 */
function formatTrackDisplay(track) {
  const title = track.title || {};
  
  // Extract clean main title (remove version info, production info, etc.)
  let cleanMainTitle = title.main || track.rawName || 'Unknown';
  
  // Remove common formatting patterns from main title
  cleanMainTitle = cleanMainTitle
    .replace(/\[V\d+\]/g, '') // Remove version markers like [V1], [V2]
    .replace(/\(feat\.[^)]+\)/g, '') // Remove feat. info from main title
    .replace(/\(prod\.[^)]+\)/g, '') // Remove prod. info from main title
    .replace(/\(ref\.[^)]+\)/g, '') // Remove ref. info from main title
    .replace(/\(with [^)]+\)/g, '') // Remove "with" collaborations from main title
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
  
  // Extract version info
  const versionMatch = (title.main || track.rawName || '').match(/\[V(\d+)\]/);
  const version = versionMatch ? `V${versionMatch[1]}` : null;
  
  // Build formatted display
  const formatted = {
    cleanTitle: cleanMainTitle,
    version: version,
    alternateNames: title.alternateNames || [],
    features: title.features || [],
    collaborators: title.collaborators || [],
    producers: title.producers || [],
    references: title.references || [],
    quality: track.quality || '',
    availability: track.availableLength || '',
    notes: track.notes || '',
    links: track.links || []
  };
  
  return formatted;
}

/**
 * Display track in clean format
 */
function displayTrack(track, index) {
  const formatted = formatTrackDisplay(track);
  
  console.log(`\n📍 Track ${index + 1}:`);
  
  // Main title (clean)
  console.log(`  🎵 ${formatted.cleanTitle}`);
  
  // Version info
  if (formatted.version) {
    console.log(`     📱 Version: ${formatted.version}`);
  }
  
  // Alternate names/titles
  if (formatted.alternateNames.length > 0) {
    console.log(`     🔄 Alt Names: ${formatted.alternateNames.join(', ')}`);
  }
  
  // Features
  if (formatted.features.length > 0) {
    console.log(`     🎤 Features: ${formatted.features.join(', ')}`);
  }
  
  // Collaborators
  if (formatted.collaborators.length > 0) {
    console.log(`     🤝 Collaborators: ${formatted.collaborators.join(', ')}`);
  }
  
  // Producers
  if (formatted.producers.length > 0) {
    console.log(`     🎛️  Producers: ${formatted.producers.join(', ')}`);
  }
  
  // References
  if (formatted.references.length > 0) {
    console.log(`     📝 References: ${formatted.references.join(', ')}`);
  }
  
  // Quality & Availability
  if (formatted.quality || formatted.availability) {
    console.log(`     💿 Quality: ${formatted.quality} | Availability: ${formatted.availability}`);
  }
  
  // Links
  if (formatted.links.length > 0) {
    console.log(`     🔗 Links: ${formatted.links.length} link(s)`);
  }
  
  // Notes (truncated)
  if (formatted.notes) {
    const shortNotes = formatted.notes.length > 100 
      ? formatted.notes.substring(0, 100) + '...' 
      : formatted.notes;
    console.log(`     📄 Notes: ${shortNotes}`);
  }
}

// Sample tracks from different eras for comparison
console.log('\n🔍 SAMPLE FORMATTED TRACK DISPLAYS');
console.log('===================================');

const sampleCount = 15;
let sampleIndex = 0;

for (const album of albums) {
  if (sampleIndex >= sampleCount) break;
  
  console.log(`\n🎯 Era: ${album.name}`);
  console.log('─'.repeat(50));
  
  const tracksToShow = Math.min(2, album.tracks.length);
  for (let i = 0; i < tracksToShow && sampleIndex < sampleCount; i++) {
    displayTrack(album.tracks[i], sampleIndex);
    sampleIndex++;
  }
}

// Analyze problematic track names
console.log('\n\n🚨 PROBLEMATIC TRACK NAME ANALYSIS');
console.log('===================================');

let problematicTracks = [];

albums.forEach(album => {
  album.tracks.forEach(track => {
    const title = track.title?.main || track.rawName || '';
    
    // Check for titles that still have production info in main title
    if (title.includes('(prod.') || 
        title.includes('(feat.') || 
        title.includes('(ref.') ||
        title.includes('[V') && title.includes(']')) {
      
      const formatted = formatTrackDisplay(track);
      problematicTracks.push({
        era: album.name,
        original: title,
        cleaned: formatted.cleanTitle,
        rawName: track.rawName
      });
    }
  });
});

console.log(`\n📊 Found ${problematicTracks.length} tracks with formatting issues:`);

// Show first 10 problematic tracks
problematicTracks.slice(0, 10).forEach((track, i) => {
  console.log(`\n${i + 1}. Era: ${track.era}`);
  console.log(`   Original: "${track.original}"`);
  console.log(`   Cleaned:  "${track.cleaned}"`);
  console.log(`   Raw Name: "${track.rawName}"`);
});

if (problematicTracks.length > 10) {
  console.log(`\n... and ${problematicTracks.length - 10} more tracks with similar issues`);
}

// Generate recommendations
console.log('\n\n💡 DISPLAY FORMATTING RECOMMENDATIONS');
console.log('====================================');

console.log('✅ Data structure is well organized with separate fields for:');
console.log('   - Main title (title.main)');
console.log('   - Features (title.features)');
console.log('   - Producers (title.producers)');
console.log('   - Collaborators (title.collaborators)');
console.log('   - References (title.references)');
console.log('   - Alternate names (title.alternateNames)');

console.log('\n📋 For UI display, use this hierarchy:');
console.log('   1. Clean main title (without version/production info)');
console.log('   2. Version info (if applicable)');
console.log('   3. Alt names/versions');
console.log('   4. Features, collaborators, producers (as separate sections)');
console.log('   5. Quality and availability info');
console.log('   6. Notes and links');

console.log('\n🔧 The formatter above shows how to extract clean titles');
console.log('   and properly separate the different types of information.');

console.log('\n🎉 FORMATTING ANALYSIS COMPLETE!');
