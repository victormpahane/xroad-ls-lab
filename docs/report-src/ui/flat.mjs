const [,, f, out] = process.argv;
const m = await import(new URL(f, import.meta.url));
const flat = {};
const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { const key = p ? p + '.' + k : k; if (v && typeof v === 'object') walk(v, key); else flat[key] = v; } };
for (const [k, v] of Object.entries(m)) if (k !== 'default') walk({ [k]: v }, '');
(await import('fs')).writeFileSync(out, Object.entries(flat).map(([k, v]) => k + ' = ' + String(v).replace(/\n/g, ' ')).join('\n'));
console.log(out, Object.keys(flat).length, 'strings');
