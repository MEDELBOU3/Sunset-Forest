const fs = require('fs');

const indexContent = fs.readFileSync('./src/scripts/sections/index.js', 'utf8');
const lines = indexContent.split('\n');
const files = [];
for (const line of lines) {
  const match = line.match(/from\s+['"]\.\/([^'"]+)['"]/);
  if (match) files.push(match[1]);
}

let fullSource = '"use strict";\n';
let hasError = false;

for (const file of files) {
  const content = fs.readFileSync('./src/scripts/sections/' + file, 'utf8');
  let codeMatch = content.match(/export default String\.raw\`([\s\S]*)\`/);
  if (!codeMatch) codeMatch = content.match(/export default `([\s\S]*)\`/);
  if (!codeMatch) codeMatch = content.match(/export default "([\s\S]*)"/);
  
  const code = codeMatch ? codeMatch[1].replace(/\\n/g, '\n') : '';
  
  try {
    new Function('THREE', 'GLTFLoader', 'PointerLockControls', code);
  } catch (e) {
    console.error('SYNTAX ERROR IN ' + file + ':', e.message);
    hasError = true;
  }
  fullSource += code + '\n';
}

if (!hasError) {
  try {
    new Function('THREE', 'GLTFLoader', 'PointerLockControls', fullSource);
    console.log('ALL SECTIONS VALID SYNTAX.');
  } catch(e) {
    console.error('SYNTAX ERROR IN FULL COMBINATION:', e.message);
  }
}
