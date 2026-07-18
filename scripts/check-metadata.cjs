const fs = require('fs');
const path = require('path');

const isfDir = path.join(__dirname, '..', 'public', 'ISF');
const files = fs.readdirSync(isfDir).filter(f => f.endsWith('.fs'));

let noMetadata = [];
let hasMetadata = 0;

for (const file of files) {
  const filePath = path.join(isfDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const trimmed = content.trimLeft();
  
  // Check various metadata formats
  const hasMeta = trimmed.startsWith('/*{') || 
                  trimmed.startsWith('/* {') ||
                  trimmed.startsWith('/*\n{') ||
                  trimmed.startsWith('/*\r\n{') ||
                  trimmed.match(/^\/\*\s*\n\s*\{/);
  
  if (hasMeta) {
    hasMetadata++;
  } else {
    noMetadata.push(file);
  }
}

console.log('Has metadata: ' + hasMetadata);
console.log('Missing metadata: ' + noMetadata.length);
if (noMetadata.length > 0) {
  console.log('\nFiles without metadata:');
  noMetadata.forEach(f => console.log('  - ' + f));
}
