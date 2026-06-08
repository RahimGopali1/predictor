const fs = require('fs');
const path = require('path');

const h = fs.readFileSync(path.join(__dirname, '..', 'client', 'src', 'app', 'pages', 'predictor', 'predictor.component.html'), 'utf8');
const lines = h.split('\n');
const stack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const opens = [...line.matchAll(/<div\b[^>]*>/g)];
  const closes = [...line.matchAll(/<\/div>/g)];
  for (const _ of opens) stack.push(i + 1);
  for (const _ of closes) {
    if (!stack.length) {
      console.log('Extra close at line', i + 1, ':', line.trim());
    } else {
      stack.pop();
    }
  }
}

console.log('Unclosed opens:', stack.length);
stack.slice(-5).forEach(l => console.log('  line', l, ':', lines[l - 1].trim().slice(0, 80)));
