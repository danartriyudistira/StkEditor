const fs = require('fs');
const path = require('path');

const isfDir = path.join(__dirname, '..', 'public', 'ISF');
const files = fs.readdirSync(isfDir).filter(f => f.endsWith('.fs'));

let fixed = 0;

for (const file of files) {
  const filePath = path.join(isfDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const trimmed = content.trimLeft();
  
  // Check various ISF metadata formats
  const hasMeta = trimmed.startsWith('/*{') || 
                  trimmed.startsWith('/* {') ||
                  trimmed.startsWith('/*\n{') ||
                  trimmed.startsWith('/*\r\n{') ||
                  trimmed.match(/^\/\*\s*\n\s*\{/);
  
  if (!hasMeta) {
    console.log('NO metadata: ' + file);
    continue;
  }
  
  // Extract the first comment block
  const firstCommentEnd = content.indexOf('*/');
  if (firstCommentEnd === -1) continue;
  
  const commentBlock = content.substring(0, firstCommentEnd + 2);
  const innerContent = commentBlock.substring(commentBlock.indexOf('/*') + 2, commentBlock.length - 2);
  
  // Try to normalize: parse and re-emit as /*{ ... }*/
  try {
    const metadata = JSON.parse(innerContent.trim());
    
    // Check if it already starts with /*{
    if (trimmed.startsWith('/*{')) continue;
    
    // Normalize: remove old block, add /*{ ... }*/
    const rest = content.substring(firstCommentEnd + 2).trimStart();
    const newHeader = '/*' + JSON.stringify(metadata, null, 2) + '*/\n\n';
    const newContent = newHeader + rest;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    fixed++;
    console.log('Normalized: ' + file);
  } catch (e) {
    console.log('PARSE ERROR: ' + file + ' - ' + e.message);
  }
}

console.log('\nNormalized: ' + fixed + ' files');
