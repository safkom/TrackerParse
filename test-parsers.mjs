// Parser comparison test
import { HtmlParser } from './utils/htmlParser';
import { ImprovedParser } from './utils/improvedParser';

const testUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?gid=0';

async function compareParserPerformance() {
  console.log('🧪 Testing Parser Performance...\n');
  
  // Test HTML Parser
  console.log('🔍 Testing HtmlParser...');
  const htmlStart = performance.now();
  try {
    const htmlResult = await HtmlParser.parseGoogleDoc(testUrl);
    const htmlTime = performance.now() - htmlStart;
    console.log(`✅ HtmlParser: ${htmlTime.toFixed(2)}ms`);
    console.log(`   - Found ${htmlResult.albums.length} albums`);
    console.log(`   - Total tracks: ${htmlResult.albums.reduce((sum, album) => sum + album.tracks.length, 0)}`);
  } catch (error) {
    console.log(`❌ HtmlParser failed: ${error.message}`);
  }
  
  // Test Improved Parser  
  console.log('\n🔍 Testing ImprovedParser...');
  const improvedStart = performance.now();
  try {
    const improvedResult = await ImprovedParser.parseGoogleDoc(testUrl);
    const improvedTime = performance.now() - improvedStart;
    console.log(`✅ ImprovedParser: ${improvedTime.toFixed(2)}ms`);
    console.log(`   - Found ${improvedResult.albums.length} albums`);
    console.log(`   - Total tracks: ${improvedResult.albums.reduce((sum, album) => sum + album.tracks.length, 0)}`);
  } catch (error) {
    console.log(`❌ ImprovedParser failed: ${error.message}`);
  }
}

// Run the test
if (typeof window === 'undefined') {
  compareParserPerformance();
}

export { compareParserPerformance };
