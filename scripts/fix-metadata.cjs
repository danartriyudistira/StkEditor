const fs = require('fs');
const path = require('path');

const isfDir = path.join(__dirname, '..', 'public', 'ISF');
const files = fs.readdirSync(isfDir).filter(f => f.endsWith('.fs'));

let fixed = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(isfDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const trimmed = content.trimLeft();
  if (trimmed.startsWith('/*{')) {
    skipped++;
    continue;
  }
  
  const inputs = [];
  
  if (content.includes('IMG_THIS_PIXEL(inputImage)') || content.includes('IMG_NORM_PIXEL(inputImage') || content.includes('IMG_PIXEL(inputImage')) {
    inputs.push({ NAME: 'inputImage', TYPE: 'image' });
  }
  if (content.includes('IMG_NORM_PIXEL(startImage') || content.includes('IMG_PIXEL(startImage')) {
    inputs.push({ NAME: 'startImage', TYPE: 'image' });
  }
  if (content.includes('IMG_NORM_PIXEL(endImage') || content.includes('IMG_PIXEL(endImage')) {
    inputs.push({ NAME: 'endImage', TYPE: 'image' });
  }
  
  const uniformFloatRegex = /uniform\s+float\s+(\w+)\s*;/g;
  let match;
  while ((match = uniformFloatRegex.exec(content)) !== null) {
    const name = match[1];
    if (!inputs.find(i => i.NAME === name) && !name.startsWith('_') && !name.endsWith('_imgSize') && !name.endsWith('_imgRect')) {
      inputs.push({ NAME: name, TYPE: 'float', DEFAULT: 0.5, MIN: 0, MAX: 1 });
    }
  }
  
  const uniformBoolRegex = /uniform\s+bool\s+(\w+)\s*;/g;
  while ((match = uniformBoolRegex.exec(content)) !== null) {
    const name = match[1];
    if (!inputs.find(i => i.NAME === name) && !name.startsWith('_')) {
      inputs.push({ NAME: name, TYPE: 'bool', DEFAULT: false });
    }
  }
  
  const uniformVec2Regex = /uniform\s+vec2\s+(\w+)\s*;/g;
  while ((match = uniformVec2Regex.exec(content)) !== null) {
    const name = match[1];
    if (!inputs.find(i => i.NAME === name) && !name.startsWith('_') && name !== 'RENDERSIZE' && name !== 'isf_fragCoord') {
      inputs.push({ NAME: name, TYPE: 'point2D', DEFAULT: [0.5, 0.5] });
    }
  }
  
  const uniformColorRegex = /uniform\s+vec4\s+(\w+)\s*;/g;
  while ((match = uniformColorRegex.exec(content)) !== null) {
    const name = match[1];
    if (!inputs.find(i => i.NAME === name) && !name.startsWith('_') && name !== 'DATE' && name !== 'RENDERSIZE') {
      inputs.push({ NAME: name, TYPE: 'color', DEFAULT: [1, 1, 1, 1] });
    }
  }
  
  const uniformIntRegex = /uniform\s+int\s+(\w+)\s*;/g;
  while ((match = uniformIntRegex.exec(content)) !== null) {
    const name = match[1];
    if (!inputs.find(i => i.NAME === name) && !name.startsWith('_') && name !== 'PASSINDEX' && name !== 'FRAMEINDEX') {
      inputs.push({ NAME: name, TYPE: 'long', DEFAULT: 0 });
    }
  }
  
  const metadata = {
    DESCRIPTION: path.basename(file, '.fs'),
    CREDIT: '',
    ISFVSN: '2',
    INPUTS: inputs,
    CATEGORIES: ['Custom']
  };
  
  const header = '/*' + JSON.stringify(metadata, null, 2) + '*/\n\n';
  const newContent = header + content;
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  fixed++;
  console.log('Fixed: ' + file + ' (' + inputs.length + ' inputs)');
}

console.log('\nDone: ' + fixed + ' files fixed, ' + skipped + ' already had metadata');
