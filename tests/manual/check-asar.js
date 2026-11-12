const asar = require('@electron/asar');
const p = 'dist/win-unpacked/resources/app.asar';
const files = asar.listPackage(p);
const norm = x => x.split('\\').join('/');
['table-resize.js', 'api-server.js', 'timer-cli.js', 'renderer.js'].forEach(f => {
    const hit = files.filter(x => norm(x).endsWith('/' + f));
    console.log(f, '->', hit.join(',') || '缺失');
});
const api = asar.extractFile(p, 'api-server.js').toString();
console.log('api 含 /api/table-view:', api.includes('/api/table-view'));
const r = asar.extractFile(p, 'renderer.js').toString();
console.log("renderer 含 case 'table':", r.includes("case 'table': {"));
const t = asar.extractFile(p, 'table-resize.js').toString();
console.log('table-resize 含 applyTableOps:', t.includes('function applyTableOps'));
const cli = asar.extractFile(p, 'timer-cli.js').toString();
console.log('cli 含 table 命令:', cli.includes('async table(args) {'));
