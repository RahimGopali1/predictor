const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'app', 'pages', 'predictor', 'predictor.component.html');
let h = fs.readFileSync(file, 'utf8');

const scriptStart = h.indexOf('<script>');
const scriptEnd = h.indexOf('</script>');
if (scriptStart > -1 && scriptEnd > -1) {
  h = h.slice(0, scriptStart) + h.slice(scriptEnd + 9);
}

h = h.replace(
  `*ngFor="let round of [['r32','Round of 32'],['r16','Round of 16'],['qf','Quarter-Final'],['sf','Semi-Final']]"`,
  '*ngFor="let round of bracketRounds"'
);
h = h.replace('modalBracket()![round[0]]', 'bracketRoundMatches(round.key)');
h = h.replace('{{ round[1] }}', '{{ round.title }}');

fs.writeFileSync(file, h, 'utf8');
console.log('Cleaned template, length:', h.length);
