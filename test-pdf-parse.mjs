#!/usr/bin/env node
/**
 * Test PDF parsing step-by-step
 */

import { readFileSync } from 'fs';
import pdfParse from 'pdf-parse';

async function testPDFParsing() {
  console.log('🔍 Testing PDF Text Extraction\n');

  const pdfPath = `${process.env.HOME}/Downloads/JetBlue - Print confirmation.pdf`;
  console.log(`📄 Reading PDF from: ${pdfPath}`);

  let pdfBuffer;
  try {
    pdfBuffer = readFileSync(pdfPath);
    console.log(`✅ PDF loaded: ${pdfBuffer.length} bytes\n`);
  } catch (error) {
    console.error(`❌ Failed to read PDF: ${error.message}`);
    process.exit(1);
  }

  // Extract text using pdf-parse
  console.log('📤 Extracting text with pdf-parse...\n');

  try {
    const data = await pdfParse(pdfBuffer);

    console.log('📊 PDF PARSE RESULTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Number of pages: ${data.numpages}`);
    console.log(`Total text length: ${data.text.length} characters`);
    console.log(`Info:`, data.info);
    console.log(`Metadata:`, data.metadata);

    console.log('\n📝 EXTRACTED TEXT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(data.text);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check for key JetBlue data
    console.log('🔎 Checking for key flight information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const checks = [
      { label: 'Confirmation code (KDNZEJ)', found: data.text.includes('KDNZEJ') },
      { label: 'Flight number B6 887', found: /B6\s*887/.test(data.text) },
      { label: 'Flight number B6 788', found: /B6\s*788/.test(data.text) },
      { label: 'Airport code JFK', found: data.text.includes('JFK') },
      { label: 'Airport code SXM', found: data.text.includes('SXM') },
      { label: 'Date Jan 8, 2026', found: data.text.includes('Jan 8, 2026') },
      { label: 'Date Jan 15, 2026', found: data.text.includes('Jan 15, 2026') },
      { label: 'Time 11:18am', found: data.text.includes('11:18am') },
      { label: 'Passenger JOAN DINOWITZ', found: data.text.includes('JOAN DINOWITZ') },
    ];

    checks.forEach(({ label, found }) => {
      console.log(`${found ? '✅' : '❌'} ${label}`);
    });

    const allFound = checks.every(c => c.found);
    console.log(`\n${allFound ? '✅' : '⚠️'} ${allFound ? 'All' : 'Some'} key data ${allFound ? 'found' : 'missing'}`);

  } catch (error) {
    console.error('💥 Error parsing PDF:', error);
    process.exit(1);
  }
}

testPDFParsing().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
