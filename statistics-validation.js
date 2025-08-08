#!/usr/bin/env node

/**
 * Statistics Validation Tool
 * 
 * This tool extracts the official statistics from the bottom of the spreadsheet
 * and compares them with our parsed data to verify parsing accuracy.
 */

const fs = require('fs');
const { execSync } = require('child_process');

async function validateStatistics() {
    console.log('📊 STATISTICS VALIDATION TOOL');
    console.log('=============================\n');
    
    let rawData, parsedData;
    
    // Load raw data
    try {
        rawData = JSON.parse(fs.readFileSync('./raw_data_analysis.json', 'utf8'));
        console.log('✅ Raw data loaded successfully');
    } catch (error) {
        console.error('❌ Error reading raw data file:', error.message);
        return;
    }
    
    // Load parsed data
    try {
        parsedData = JSON.parse(fs.readFileSync('./parsed_data_analysis.json', 'utf8'));
        console.log('✅ Parsed data loaded successfully\n');
    } catch (error) {
        console.error('❌ Error reading parsed data file:', error.message);
        console.log('💡 Run: curl -X POST http://localhost:3000/api/debug/parse -H "Content-Type: application/json" -d \'{"googleDocsUrl": "https://docs.google.com/spreadsheets/u/0/d/1a5OJXbi1hih1r6h6WZsATA7HJmPBQzevp7SRB2EsNCs/htmlview"}\' > parsed_data_analysis.json');
        return;
    }
    
    // Extract official statistics from raw data
    console.log('🔍 EXTRACTING OFFICIAL STATISTICS');
    console.log('=================================');
    
    const statsData = findStatsInRawData(rawData);
    if (statsData) {
        console.log('✅ Found official statistics row in spreadsheet');
        console.log(`📍 Located at row ${statsData.rowIndex}\n`);
    } else {
        console.log('⚠️ Could not find official statistics row in raw data\n');
    }
    
    // Calculate statistics from parsed data
    console.log('🧮 CALCULATING PARSED STATISTICS');
    console.log('================================');
    
    const calculatedStats = calculateParsedStats(parsedData.result);
    
    console.log('Calculated from parsed data:');
    console.log(`📁 Total Albums: ${calculatedStats.totalAlbums}`);
    console.log(`🎵 Total Tracks: ${calculatedStats.totalTracks}`);
    console.log();
    
    console.log('📊 Quality Distribution:');
    Object.entries(calculatedStats.qualityBreakdown).forEach(([quality, count]) => {
        if (count > 0) {
            console.log(`  ${quality}: ${count}`);
        }
    });
    console.log();
    
    console.log('📁 Availability Distribution:');
    Object.entries(calculatedStats.availabilityBreakdown).forEach(([type, count]) => {
        if (count > 0) {
            console.log(`  ${type}: ${count}`);
        }
    });
    console.log();
    
    // Parse official statistics if found
    if (statsData) {
        console.log('📋 OFFICIAL vs PARSED COMPARISON');
        console.log('=================================');
        
        const officialStats = parseOfficialStats(statsData);
        
        console.log('Official Statistics (from spreadsheet bottom):');
        
        if (officialStats.links && Object.keys(officialStats.links).length > 0) {
            console.log('Links:');
            Object.entries(officialStats.links).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
        }
        
        if (officialStats.quality && Object.keys(officialStats.quality).length > 0) {
            console.log('Quality:');
            Object.entries(officialStats.quality).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
        }
        
        if (officialStats.availability && Object.keys(officialStats.availability).length > 0) {
            console.log('Availability:');
            Object.entries(officialStats.availability).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
        }
        
        if (officialStats.highlighted && Object.keys(officialStats.highlighted).length > 0) {
            console.log('Highlighted:');
            Object.entries(officialStats.highlighted).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
        }
        console.log();
        
        // Compare and validate
        console.log('🔍 VALIDATION RESULTS');
        console.log('=====================');
        
        const validation = compareStats(officialStats, calculatedStats);
        
        Object.entries(validation).forEach(([category, result]) => {
            console.log(`${category}: ${result.status}`);
            if (result.details) {
                result.details.forEach(detail => console.log(`  ${detail}`));
            }
        });
        
    } else {
        console.log('⚠️ Cannot perform official comparison - stats row not found');
    }
    
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('==================');
    console.log('1. Verify quality field parsing logic');
    console.log('2. Check availability field mapping');
    console.log('3. Ensure all track types are properly categorized');
    console.log('4. Review edge cases in data parsing');
    console.log('5. Validate metadata extraction accuracy');
}

function findStatsInRawData(rawData) {
    // The rawData.rawData is a single tab-separated string, not individual rows
    console.log(`🔍 Searching through raw data string for bottom statistics...`);
    
    // Split the raw data into lines
    const lines = rawData.rawData.split('\n');
    console.log(`📊 Total lines in raw data: ${lines.length}`);
    
    // Check the last 200 lines for statistics patterns
    const startLine = Math.max(0, lines.length - 200);
    console.log(`📊 Checking lines ${startLine} to ${lines.length} for statistics`);
    
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;
        
        // Split line by tabs to get columns
        const columns = line.split('\t');
        
        // Convert to lowercase for pattern matching
        const lineText = line.toLowerCase();
        
        // Look for the statistics pattern - should have multiple quality/availability indicators
        if ((lineText.includes('total links') || lineText.includes('lossless') || lineText.includes('cd quality')) &&
            (lineText.includes('og files') || lineText.includes('total full')) &&
            (lineText.includes('best of') || lineText.includes('special') || lineText.includes('grails'))) {
            
            console.log(`✅ Found statistics line at position ${i}:`);
            console.log(`   Raw line: ${line.substring(0, 200)}...`);
            
            // Parse columns - statistics should be in a 4-column format
            if (columns.length >= 4) {
                return {
                    lineIndex: i,
                    links: columns[0] || '',
                    quality: columns[1] || '',
                    availability: columns[2] || '',
                    highlighted: columns[3] || ''
                };
            } else {
                // If not properly columned, try to parse as single field
                return {
                    lineIndex: i,
                    combined: line
                };
            }
        }
        
        // Also check for individual statistics patterns that might be in separate lines
        if (lineText.includes('5477 total links') || lineText.includes('1060 lossless') || 
            lineText.includes('3757 total full') || lineText.includes('136 best of')) {
            console.log(`📊 Found potential statistics fragment at line ${i}: ${line.substring(0, 100)}...`);
        }
    }
    
    console.log('⚠️ No complete statistics row found in bottom 200 lines');
    
    // Try a broader search for any statistics patterns
    console.log('🔍 Performing broader search for statistics patterns...');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const lineText = line.toLowerCase();
        
        // Look for the specific patterns from the examples
        if ((lineText.includes('5477 total links') && lineText.includes('22 missing links')) ||
            (lineText.includes('1060 lossless') && lineText.includes('2360 cd quality')) ||
            (lineText.includes('3757 total full') && lineText.includes('2665 og files'))) {
            
            console.log(`✅ Found statistics pattern at line ${i}:`);
            console.log(`   Line: ${line.substring(0, 200)}...`);
            
            return {
                lineIndex: i,
                combined: line
            };
        }
    }
    
    return null;
}

function parseOfficialStats(statsData) {
    const stats = {
        links: {},
        quality: {},
        availability: {},
        highlighted: {}
    };
    
    // Parse each section
    const sections = [
        { text: statsData.links, category: 'links' },
        { text: statsData.quality, category: 'quality' },
        { text: statsData.availability, category: 'availability' },
        { text: statsData.highlighted, category: 'highlighted' }
    ];
    
    sections.forEach(section => {
        if (!section.text) return;
        
        // Extract numbers and their associated types using more specific patterns
        const patterns = getStatsPatterns(section.category);
        
        patterns.forEach(pattern => {
            const matches = [...section.text.matchAll(pattern.regex)];
            matches.forEach(match => {
                const count = parseInt(match[1]);
                if (!isNaN(count)) {
                    stats[section.category][pattern.type] = count;
                }
            });
        });
    });
    
    return stats;
}

function getStatsPatterns(category) {
    const patterns = {
        links: [
            { regex: /(\d+)\s*total\s*links/gi, type: 'Total Links' },
            { regex: /(\d+)\s*missing\s*links/gi, type: 'Missing Links' },
            { regex: /(\d+)\s*sources\s*needed/gi, type: 'Sources Needed' },
            { regex: /(\d+)\s*not\s*avaliable/gi, type: 'Not Available' }, // Note: typo in original
            { regex: /(\d+)\s*not\s*available/gi, type: 'Not Available' }
        ],
        quality: [
            { regex: /(\d+)\s*lossless/gi, type: 'Lossless' },
            { regex: /(\d+)\s*cd\s*quality/gi, type: 'CD Quality' },
            { regex: /(\d+)\s*high\s*quality/gi, type: 'High Quality' },
            { regex: /(\d+)\s*low\s*quality/gi, type: 'Low Quality' },
            { regex: /(\d+)\s*recordings?/gi, type: 'Recordings' },
            { regex: /(\d+)\s*not\s*available/gi, type: 'Not Available' }
        ],
        availability: [
            { regex: /(\d+)\s*total\s*full/gi, type: 'Total Full' },
            { regex: /(\d+)\s*og\s*files?/gi, type: 'OG Files' },
            { regex: /(\d+)\s*stem\s*bounces?/gi, type: 'Stem Bounces' },
            { regex: /(\d+)\s*full(?!\s*links)/gi, type: 'Full' },
            { regex: /(\d+)\s*tagged/gi, type: 'Tagged' },
            { regex: /(\d+)\s*partial/gi, type: 'Partial' },
            { regex: /(\d+)\s*snippets?/gi, type: 'Snippets' },
            { regex: /(\d+)\s*unavailable/gi, type: 'Unavailable' }
        ],
        highlighted: [
            { regex: /(\d+)\s*best\s*of/gi, type: 'Best Of' },
            { regex: /(\d+)\s*special/gi, type: 'Special' },
            { regex: /(\d+)\s*grails/gi, type: 'Grails' },
            { regex: /(\d+)\s*wanted/gi, type: 'Wanted' },
            { regex: /(\d+)\s*worst\s*of/gi, type: 'Worst Of' }
        ]
    };
    
    return patterns[category] || [];
}

function calculateParsedStats(artistData) {
    const stats = {
        totalAlbums: artistData.albums.length,
        totalTracks: 0,
        qualityBreakdown: {},
        availabilityBreakdown: {},
        metadataStats: {
            ogFiles: 0,
            fullFiles: 0,
            taggedFiles: 0,
            partialFiles: 0,
            snippetFiles: 0,
            stemBounceFiles: 0,
            unavailableFiles: 0
        }
    };
    
    artistData.albums.forEach(album => {
        stats.totalTracks += album.tracks.length;
        
        // Add metadata stats
        if (album.metadata) {
            stats.metadataStats.ogFiles += album.metadata.ogFiles || 0;
            stats.metadataStats.fullFiles += album.metadata.fullFiles || 0;
            stats.metadataStats.taggedFiles += album.metadata.taggedFiles || 0;
            stats.metadataStats.partialFiles += album.metadata.partialFiles || 0;
            stats.metadataStats.snippetFiles += album.metadata.snippetFiles || 0;
            stats.metadataStats.stemBounceFiles += album.metadata.stemBounceFiles || 0;
            stats.metadataStats.unavailableFiles += album.metadata.unavailableFiles || 0;
        }
        
        album.tracks.forEach(track => {
            // Quality breakdown
            const quality = track.quality || 'Unknown';
            stats.qualityBreakdown[quality] = (stats.qualityBreakdown[quality] || 0) + 1;
            
            // Availability breakdown
            const availability = track.availableLength || 'Unknown';
            stats.availabilityBreakdown[availability] = (stats.availabilityBreakdown[availability] || 0) + 1;
        });
    });
    
    return stats;
}

function compareStats(official, calculated) {
    const validation = {};
    
    // Compare metadata totals
    const officialTotal = Object.values(official.availability).reduce((sum, val) => sum + (val || 0), 0);
    const calculatedTotal = Object.values(calculated.metadataStats).reduce((sum, val) => sum + (val || 0), 0);
    
    validation.totalFiles = {
        status: Math.abs(officialTotal - calculatedTotal) < 50 ? '✅ CLOSE MATCH' : '⚠️ SIGNIFICANT DIFFERENCE',
        details: [
            `Official total: ${officialTotal}`,
            `Calculated total: ${calculatedTotal}`,
            `Difference: ${Math.abs(officialTotal - calculatedTotal)}`
        ]
    };
    
    // Compare specific categories
    if (official.availability['OG Files'] && calculated.metadataStats.ogFiles) {
        const diff = Math.abs(official.availability['OG Files'] - calculated.metadataStats.ogFiles);
        validation.ogFiles = {
            status: diff < 10 ? '✅ MATCH' : '⚠️ DIFFERENCE',
            details: [`Official: ${official.availability['OG Files']}, Calculated: ${calculated.metadataStats.ogFiles}, Diff: ${diff}`]
        };
    }
    
    if (official.availability['Full'] && calculated.metadataStats.fullFiles) {
        const diff = Math.abs(official.availability['Full'] - calculated.metadataStats.fullFiles);
        validation.fullFiles = {
            status: diff < 20 ? '✅ CLOSE' : '⚠️ DIFFERENCE',
            details: [`Official: ${official.availability['Full']}, Calculated: ${calculated.metadataStats.fullFiles}, Diff: ${diff}`]
        };
    }
    
    return validation;
}

validateStatistics().catch(console.error);
