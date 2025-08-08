#!/usr/bin/env node

/**
 * Apply track deduplication to existing parsed data
 * This will help us see if the deduplication logic reduces the track count as expected
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 APPLYING TRACK DEDUPLICATION TO EXISTING PARSED DATA');
console.log('======================================================');

// Load existing parsed data
const parsedDataPath = path.join(__dirname, 'parsed_data_analysis.json');
if (!fs.existsSync(parsedDataPath)) {
  console.error('❌ parsed_data_analysis.json not found!');
  process.exit(1);
}

const rawData = fs.readFileSync(parsedDataPath, 'utf8');
const parsedResponse = JSON.parse(rawData);

// Extract the albums array from the response structure
const parsedData = parsedResponse.result?.albums || parsedResponse.albums || parsedResponse;

console.log('✅ Loaded existing parsed data');
console.log(`📁 Albums: ${parsedData.length}`);

let totalTracksBefore = 0;
let totalTracksAfter = 0;
let duplicatesRemoved = 0;

// Apply deduplication to each album
parsedData.forEach((album, albumIndex) => {
  console.log(`\n🎵 Processing album ${albumIndex + 1}: ${album.name}`);
  
  const originalTrackCount = album.tracks.length;
  totalTracksBefore += originalTrackCount;
  
  console.log(`  📊 Original tracks: ${originalTrackCount}`);
  
  // Create a map to group tracks by identity
  const trackGroups = new Map();
  
  album.tracks.forEach(track => {
    // Create the same identifier used in the parsing logic
    const trackIdentifier = `${track.era}-${track.rawName}-${track.notes}-${track.availableLength}-${track.quality}`;
    
    if (trackGroups.has(trackIdentifier)) {
      // Merge links into existing track
      const existingTrack = trackGroups.get(trackIdentifier);
      existingTrack.links.push(...track.links);
      duplicatesRemoved++;
      console.log(`    🔗 Merged duplicate: ${track.rawName} (${track.links.length} additional links)`);
    } else {
      // Add new track
      trackGroups.set(trackIdentifier, {
        ...track,
        links: [...track.links] // Create a copy of links array
      });
    }
  });
  
  // Replace album tracks with deduplicated tracks
  album.tracks = Array.from(trackGroups.values());
  
  const newTrackCount = album.tracks.length;
  totalTracksAfter += newTrackCount;
  
  console.log(`  ✨ Deduplicated tracks: ${newTrackCount}`);
  console.log(`  📉 Reduction: ${originalTrackCount - newTrackCount} tracks (${((originalTrackCount - newTrackCount) / originalTrackCount * 100).toFixed(1)}%)`);
});

console.log('\n🎯 DEDUPLICATION SUMMARY');
console.log('========================');
console.log(`📊 Total tracks before: ${totalTracksBefore}`);
console.log(`✨ Total tracks after: ${totalTracksAfter}`);
console.log(`🔗 Duplicates removed: ${duplicatesRemoved}`);
console.log(`📉 Overall reduction: ${totalTracksBefore - totalTracksAfter} tracks (${((totalTracksBefore - totalTracksAfter) / totalTracksBefore * 100).toFixed(1)}%)`);

// Save deduplicated data
const deduplicatedPath = path.join(__dirname, 'parsed_data_deduplicated.json');
fs.writeFileSync(deduplicatedPath, JSON.stringify(parsedData, null, 2), 'utf8');

console.log(`\n💾 Saved deduplicated data to: parsed_data_deduplicated.json`);

// Calculate new statistics
console.log('\n📊 NEW STATISTICS AFTER DEDUPLICATION');
console.log('====================================');

const qualityStats = {};
const availabilityStats = {};

parsedData.forEach(album => {
  album.tracks.forEach(track => {
    // Count quality
    const quality = track.quality || 'Unknown';
    qualityStats[quality] = (qualityStats[quality] || 0) + 1;
    
    // Count availability  
    const availability = track.availableLength || 'Unknown';
    availabilityStats[availability] = (availabilityStats[availability] || 0) + 1;
  });
});

console.log('\n💿 Quality Distribution:');
Object.entries(qualityStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([quality, count]) => {
    console.log(`  ${quality}: ${count}`);
  });

console.log('\n📁 Availability Distribution:');
Object.entries(availabilityStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([availability, count]) => {
    console.log(`  ${availability}: ${count}`);
  });

// Calculate coverage vs official stats
const officialTotalTracks = 3757; // From our validation
const newCoverage = (totalTracksAfter / officialTotalTracks * 100).toFixed(1);

console.log('\n🎯 COVERAGE ANALYSIS');
console.log('===================');
console.log(`Official total tracks: ${officialTotalTracks}`);
console.log(`Parsed tracks (after dedup): ${totalTracksAfter}`);
console.log(`New coverage: ${newCoverage}%`);

if (parseFloat(newCoverage) <= 100) {
  console.log('✅ SUCCESS: Coverage is now within expected range!');
} else {
  console.log('⚠️  Still over 100% coverage - may need further investigation');
}

console.log('\n🎉 DEDUPLICATION COMPLETE!');
