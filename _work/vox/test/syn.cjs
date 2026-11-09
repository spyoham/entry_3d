const acorn = require('../../../entry-vibe-coding/node_modules/acorn');
const fs = require('fs');
for (const f of fs.readdirSync('src')) {
  try { acorn.parse(fs.readFileSync('src/' + f, 'utf8'), { ecmaVersion: 2022 }); }
  catch (e) { console.log(f, e.message); }
}
