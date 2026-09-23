const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const keyLine = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = keyLine.split('=')[1].trim();

fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
  .then(r => r.json())
  .then(d => console.log(d.models.map(m => m.name + ' - ' + m.supportedGenerationMethods.join(', ')).join('\n')))
  .catch(console.error);
