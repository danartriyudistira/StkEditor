const fs = require('fs');
const path = require('path');

const isfDir = path.join(__dirname, '..', 'public', 'ISF');

// List of files that originally had metadata but my script added duplicate header
// These files had /*\n{ format instead of /*{ format
const filesToCheck = fs.readdirSync(isfDir).filter(f => f.endsWith('.fs'));

let fixed = 0;

for (const file of filesToCheck) {
  const filePath = path.join(isfDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file starts with our auto-generated header AND has original metadata below
  // Our header format: /*{\n  "DESCRIPTION": ...
  // Original format might be: /*\n{ or /* { or other variations
  
  if (content.startsWith('/*{\n  "DESCRIPTION"')) {
    // Find if there's another /*{ or /* { or /*\n{ after our header
    const afterHeader = content.substring(content.indexOf('*/') + 2);
    const trimmedAfter = afterHeader.trimLeft();
    
    if (trimmedAfter.startsWith('/*') && (trimmedAfter.includes('"INPUTS"') || trimmedAfter.includes('"CATEGORIES"'))) {
      // There's original metadata below - remove our added header
      const newContent = afterHeader.trimStart();
      fs.writeFileSync(filePath, newContent, 'utf8');
      fixed++;
      console.log('Removed duplicate header from: ' + file);
    }
  }
}

console.log('\nFixed: ' + fixed + ' files');
