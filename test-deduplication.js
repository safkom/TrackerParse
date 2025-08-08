const fs = require('fs');

// Load the raw and parsed data
const rawDataJson = JSON.parse(fs.readFileSync('complete_raw_data.json', 'utf8'));
const parsedData = JSON.parse(fs.readFileSync('parsed_data_analysis.json', 'utf8'));

console.log('📊 TRACK DEDUPLICATION TEST');
console.log('===========================');

// Parse the tab-separated raw data
const rawDataString = rawDataJson.rawData;
const rawDataLines = rawDataString.split('\n');

// Convert to array format (skip header row)
const trackRows = [];
rawDataLines.forEach((line, index) => {
  if (index === 0) return; // Skip header
  if (!line.trim()) return; // Skip empty lines
  
  const row = line.split('\t');
  if (row.length >= 8 && row[1] && row[1].trim() !== '') {
    trackRows.push(row);
  }
});

console.log(`📝 Found ${trackRows.length} track rows in raw data`);

// Group by track identity (era + name + notes + quality + availability) 
const trackGroups = {};
trackRows.forEach((row, index) => {
  const era = row[0] || '';
  const name = row[1] || '';
  const notes = row[2] || '';
  const availableLength = row[6] || '';
  const quality = row[7] || '';
  
  const identifier = `${era}|${name}|${notes}|${availableLength}|${quality}`;
  
  if (!trackGroups[identifier]) {
    trackGroups[identifier] = [];
  }
  trackGroups[identifier].push({
    rowIndex: index,
    era,
    name,
    notes,
    quality,
    availableLength,
    links: row[8] || ''
  });
});

// Find tracks that appear multiple times (duplicates)
const duplicateTracks = Object.entries(trackGroups).filter(([identifier, tracks]) => tracks.length > 1);

console.log(`\n🔍 DUPLICATE ANALYSIS`);
console.log(`Total unique track identities: ${Object.keys(trackGroups).length}`);
console.log(`Track identities with multiple rows: ${duplicateTracks.length}`);
console.log(`Total raw rows: ${trackRows.length}`);

if (duplicateTracks.length > 0) {
  console.log(`\n📝 EXAMPLES OF DUPLICATES:`);
  duplicateTracks.slice(0, 5).forEach(([identifier, tracks], i) => {
    console.log(`\n${i + 1}. "${tracks[0].name}" (${tracks.length} rows)`);
    console.log(`   Era: ${tracks[0].era}`);
    console.log(`   Quality: ${tracks[0].quality}`);
    console.log(`   Availability: ${tracks[0].availableLength}`);
    console.log(`   Links:`);
    tracks.forEach((track, j) => {
      const linkPreview = track.links.length > 50 ? track.links.substring(0, 50) + '...' : track.links;
      console.log(`     ${j + 1}. ${linkPreview}`);
    });
  });
}

// Calculate expected vs actual track count
const uniqueTrackCount = Object.keys(trackGroups).length;
const totalRowCount = trackRows.length;
const duplicateRowCount = totalRowCount - uniqueTrackCount;

console.log(`\n🎯 EXPECTED RESULTS AFTER DEDUPLICATION:`);
console.log(`Current parsed tracks: ${parsedData.length}`);
console.log(`Raw data rows: ${totalRowCount}`);
console.log(`Unique tracks (after deduplication): ${uniqueTrackCount}`);
console.log(`Duplicate rows that should be merged: ${duplicateRowCount}`);
console.log(`Expected reduction: ${((duplicateRowCount / totalRowCount) * 100).toFixed(1)}%`);
console.log(`Target track count: ${uniqueTrackCount}`);
