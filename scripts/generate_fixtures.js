const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname, '..', 'fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. Create native-text.pdf
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kinds /Page /Count 1 /Kids [ 3 0 R ] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 612 792 ] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 280 >>
stream
BT
/F1 12 Tf
50 720 Td
(INK & SIGNAL DOCUMENT ASSISTANT REPORT) Tj
0 -24 Td
(This is a native text PDF fixture for testing document summarization.) Tj
0 -18 Td
(The document outlines project objectives, timeline, and deliverables.) Tj
0 -18 Td
(All requirements must be verified with automated Playwright end-to-end tests.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000125 00000 n 
0000000245 00000 n 
0000000575 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
644
%%EOF`;

fs.writeFileSync(path.join(fixturesDir, 'native-text.pdf'), pdfContent);
console.log('Created fixtures/native-text.pdf');

// 2. Create sample-image.png from a valid base64 PNG containing text image
// A small valid PNG image
const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAZAAAADICAYAAADG1fQ2AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAABoCSURBVHic7d3/j1zVgQfw88+6Z+1d7x...';

// Write a valid minimal PNG file buffer
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
fs.writeFileSync(path.join(fixturesDir, 'sample-image.png'), pngBuffer);
console.log('Created fixtures/sample-image.png');

// 3. Create scanned-document.pdf containing page without text stream
const scannedPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [ 3 0 R ] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 612 792 ] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 20 >>
stream
q
50 50 500 700 re
f
Q
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
270
%%EOF`;

fs.writeFileSync(path.join(fixturesDir, 'scanned-document.pdf'), scannedPdfContent);
console.log('Created fixtures/scanned-document.pdf');
