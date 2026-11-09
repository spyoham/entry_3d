// blocks of the functions whose names match: node test/fnsize.mjs regexp
import { buildProject } from '../build.mjs';
const re = new RegExp(process.argv[2] || '.');
const { project } = buildProject('test/fnsize.ent', {});
for (const f of project.functions) { const n = (f.content.match(/function_field_label","params":\["([^"]+)"/) || [])[1]; if (re.test(n)) console.log(n, f.content.split('"type"').length - 1); }
