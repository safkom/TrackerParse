#!/usr/bin/env node

/**
 * Performance test for the restructured TrackerParse app
 * Tests the unified parser performance and accuracy
 */

const axios = require('axios');

// Test Google Sheets URL (public sample sheet)
const TEST_URL = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=0';
const API_BASE = 'http://localhost:3001';

async function testUnifiedParser() {
  console.log('🧪 Testing Unified Parser Performance\n');
  
  try {
    const startTime = Date.now();
    
    console.log('📋 Sending parse request...');
    const response = await axios.post(`${API_BASE}/api/parse`, {
      googleDocsUrl: TEST_URL
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.status === 200) {
      const { artist } = response.data;
      
      console.log('✅ Parse completed successfully!');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`👤 Artist: ${artist.name}`);
      console.log(`📁 Albums: ${artist.albums.length}`);
      
      const totalTracks = artist.albums.reduce((sum, album) => sum + album.tracks.length, 0);
      console.log(`🎵 Total Tracks: ${totalTracks}`);
      
      // Test some track parsing
      if (totalTracks > 0) {
        const firstTrack = artist.albums[0]?.tracks[0];
        if (firstTrack) {
          console.log('\n📝 Sample Track Parsing:');
          console.log(`  Name: ${firstTrack.rawName}`);
          console.log(`  Parsed Title: ${firstTrack.title.main}`);
          console.log(`  Features: ${firstTrack.title.features.join(', ') || 'None'}`);
          console.log(`  Links: ${firstTrack.links.length}`);
        }
      }
      
      // Performance assessment
      console.log('\n📊 Performance Assessment:');
      if (duration < 5000) {
        console.log('🚀 Excellent performance (< 5s)');
      } else if (duration < 10000) {
        console.log('✅ Good performance (< 10s)');
      } else if (duration < 20000) {
        console.log('⚠️  Acceptable performance (< 20s)');
      } else {
        console.log('❌ Poor performance (> 20s)');
      }
      
      return true;
    } else {
      console.log(`❌ Request failed with status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Unknown error'}`);
    }
    return false;
  }
}

async function testDebugEndpoint() {
  console.log('\n🐛 Testing Debug Endpoint...');
  
  try {
    const response = await axios.post(`${API_BASE}/api/debug/parse`, {
      googleDocsUrl: TEST_URL
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('✅ Debug endpoint working');
      console.log(`📊 Debug Info: ${JSON.stringify(response.data.debugInfo, null, 2)}`);
      return true;
    } else {
      console.log(`❌ Debug endpoint failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Debug test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🎯 TrackerParse Performance Test Suite');
  console.log('=====================================\n');
  
  const results = {
    parser: await testUnifiedParser(),
    debug: await testDebugEndpoint()
  };
  
  console.log('\n📈 Test Results Summary:');
  console.log('========================');
  console.log(`Parser Test: ${results.parser ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Debug Test:  ${results.debug ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! The restructured app is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = { testUnifiedParser, testDebugEndpoint };
