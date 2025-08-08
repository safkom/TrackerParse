#!/usr/bin/env node

/**
 * Comprehensive Parser Analysis Tool
 * Checks song amounts per era, grouping accuracy, and data assignment correctness
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE PARSER ANALYSIS');
console.log('=================================');

// Load fresh parsed data
const parsedDataPath = path.join(__dirname, 'fresh_parsed_data.json');

if (!fs.existsSync(parsedDataPath)) {
  console.error('❌ fresh_parsed_data.json not found!');
  process.exit(1);
}

console.log('✅ Loading fresh parsed data...');
const parsedResponse = JSON.parse(fs.readFileSync(parsedDataPath, 'utf8'));

const albums = parsedResponse.artist?.albums || [];

console.log(`📊 Loaded ${albums.length} albums/eras`);

// Skip raw data analysis for now
console.log('\n⚠️  Raw data analysis skipped (no raw data access)');

// Analyze parsed data structure
console.log('\n🎵 ANALYZING PARSED ALBUMS');
console.log('=========================');

let totalTracks = 0;
const qualityStats = {};
const availabilityStats = {};
const eraTrackCounts = [];

albums.forEach(album => {
  const trackCount = album.tracks.length;
  totalTracks += trackCount;
  
  eraTrackCounts.push({
    era: album.name,
    tracks: trackCount,
    alternateNames: album.alternateNames || []
  });
  
  // Analyze track data quality
  album.tracks.forEach(track => {
    // Quality distribution
    const quality = track.quality || 'Unknown';
    qualityStats[quality] = (qualityStats[quality] || 0) + 1;
    
    // Availability distribution
    const availability = track.availableLength || 'Unknown';
    availabilityStats[availability] = (availabilityStats[availability] || 0) + 1;
  });
});

console.log(`📊 Total parsed tracks: ${totalTracks}`);
console.log(`📁 Total albums/eras: ${albums.length}`);

// Display era track counts
console.log('\n📈 TRACKS PER ERA:');
eraTrackCounts.forEach(era => {
  const altNames = era.alternateNames.length > 0 ? ` (alt: ${era.alternateNames.join(', ')})` : '';
  console.log(`  ${era.era}: ${era.tracks} tracks${altNames}`);
});

// Check for suspicious era groupings
console.log('\n🚨 POTENTIAL GROUPING ISSUES:');
const suspiciousEras = eraTrackCounts.filter(era => era.tracks > 400);
if (suspiciousEras.length > 0) {
  console.log('⚠️  Eras with unusually high track counts (possible mis-grouping):');
  suspiciousEras.forEach(era => {
    console.log(`  - ${era.era}: ${era.tracks} tracks`);
  });
} else {
  console.log('✅ No suspicious era groupings detected');
}

// Display quality distribution
console.log('\n💿 QUALITY DISTRIBUTION:');
Object.entries(qualityStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([quality, count]) => {
    const percentage = ((count / totalTracks) * 100).toFixed(1);
    console.log(`  ${quality}: ${count} (${percentage}%)`);
  });

// Display availability distribution
console.log('\n📁 AVAILABILITY DISTRIBUTION:');
Object.entries(availabilityStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([availability, count]) => {
    const percentage = ((count / totalTracks) * 100).toFixed(1);
    console.log(`  ${availability}: ${count} (${percentage}%)`);
  });

// Analyze track data assignment correctness
console.log('\n🔍 TRACK DATA ASSIGNMENT ANALYSIS');
console.log('=================================');

let tracksWithLinks = 0;
let tracksWithoutLinks = 0;
let tracksWithMultipleLinks = 0;
let tracksWithQuality = 0;
let tracksWithAvailability = 0;
let tracksWithNotes = 0;

albums.forEach(album => {
  album.tracks.forEach(track => {
    // Link analysis
    if (track.links && track.links.length > 0) {
      tracksWithLinks++;
      if (track.links.length > 1) {
        tracksWithMultipleLinks++;
      }
    } else {
      tracksWithoutLinks++;
    }
    
    // Data completeness
    if (track.quality && track.quality.trim()) tracksWithQuality++;
    if (track.availableLength && track.availableLength.trim()) tracksWithAvailability++;
    if (track.notes && track.notes.trim()) tracksWithNotes++;
  });
});

console.log(`🔗 Tracks with links: ${tracksWithLinks} (${((tracksWithLinks / totalTracks) * 100).toFixed(1)}%)`);
console.log(`❌ Tracks without links: ${tracksWithoutLinks} (${((tracksWithoutLinks / totalTracks) * 100).toFixed(1)}%)`);
console.log(`📚 Tracks with multiple links: ${tracksWithMultipleLinks} (${((tracksWithMultipleLinks / totalTracks) * 100).toFixed(1)}%)`);
console.log(`💿 Tracks with quality info: ${tracksWithQuality} (${((tracksWithQuality / totalTracks) * 100).toFixed(1)}%)`);
console.log(`📁 Tracks with availability info: ${tracksWithAvailability} (${((tracksWithAvailability / totalTracks) * 100).toFixed(1)}%)`);
console.log(`📝 Tracks with notes: ${tracksWithNotes} (${((tracksWithNotes / totalTracks) * 100).toFixed(1)}%)`);

// Sample tracks for quality inspection
console.log('\n🔬 SAMPLE TRACK INSPECTION');
console.log('=========================');

const sampleTracks = [];
albums.forEach(album => {
  if (sampleTracks.length < 10 && album.tracks.length > 0) {
    sampleTracks.push({
      era: album.name,
      track: album.tracks[0]
    });
  }
});

sampleTracks.forEach((sample, i) => {
  const track = sample.track;
  console.log(`\n  Track ${i + 1} (${sample.era}):`);
  console.log(`    Name: "${track.rawName}"`);
  console.log(`    Quality: "${track.quality}"`);
  console.log(`    Availability: "${track.availableLength}"`);
  console.log(`    Links: ${track.links ? track.links.length : 0}`);
  console.log(`    Notes: "${track.notes ? track.notes.substring(0, 100) : 'None'}${track.notes && track.notes.length > 100 ? '...' : ''}"`);
});

// Check for track deduplication effectiveness
console.log('\n🔄 DEDUPLICATION EFFECTIVENESS');
console.log('=============================');

if (tracksWithMultipleLinks > 0) {
  console.log(`✅ Found ${tracksWithMultipleLinks} tracks with multiple links - deduplication working!`);
  
  // Show examples of deduplicated tracks
  albums.forEach(album => {
    album.tracks.forEach(track => {
      if (track.links && track.links.length > 1) {
        console.log(`    📎 "${track.rawName}": ${track.links.length} links merged`);
        return;
      }
    });
  });
} else {
  console.log('⚠️  No tracks with multiple links found - either:');
  console.log('    1. No duplicate tracks existed in source data, OR');
  console.log('    2. Deduplication logic needs improvement, OR');
  console.log('    3. Tracks are being incorrectly split instead of merged');
}

console.log('\n🎯 SUMMARY');
console.log('===========');
console.log(`📊 Total albums/eras: ${albums.length}`);
console.log(`🎵 Total tracks: ${totalTracks}`);
console.log(`📈 Average tracks per era: ${(totalTracks / albums.length).toFixed(1)}`);
console.log(`💿 Data completeness: ${((tracksWithQuality / totalTracks) * 100).toFixed(1)}% have quality info`);
console.log(`🔗 Link coverage: ${((tracksWithLinks / totalTracks) * 100).toFixed(1)}% have links`);

// Recommendations
console.log('\n💡 RECOMMENDATIONS');
console.log('===================');

if (tracksWithoutLinks > totalTracks * 0.2) {
  console.log('⚠️  High number of tracks without links - consider investigating link parsing');
}

if (suspiciousEras.length > 0) {
  console.log('⚠️  Some eras have very high track counts - check era detection logic');
}

if (tracksWithMultipleLinks === 0) {
  console.log('⚠️  No tracks with multiple links found - verify deduplication is working');
} else {
  console.log('✅ Track deduplication appears to be working correctly');
}

console.log('\n🎉 ANALYSIS COMPLETE!');
