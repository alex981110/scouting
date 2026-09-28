const http = require('http'), fs = require('fs'), path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'scouting.db'));
db.exec(`CREATE TABLE IF NOT EXISTS stats(
  partido TEXT, equipo TEXT, dorsal TEXT, jugador TEXT,
  minutos REAL, pts REAL, t2m REAL, t2a REAL, t3m REAL, t3a REAL, tlm REAL, tla REAL,
  reb REAL, ast REAL, rec REAL, per REAL, tap REAL, fc REAL, fr REAL, val REAL, pm REAL,
  PRIMARY KEY (partido, equipo, jugador))`);

const upsert = db.prepare(`INSERT OR REPLACE INTO stats VALUES
  (@partido,@equipo,@dorsal,@jugador,@minutos,@pts,@t2m,@t2a,@t3m,@t3a,@tlm,@tla,@reb,@ast,@rec,@per,@tap,@fc,@fr,@val,@pm)`);
const saveAll = db.transaction(rows => rows.forEach(x => upsert.run({
  partido: x.match, equipo: x.team, dorsal: String(x.n), jugador: x.name, minutos: x.min, pts: x.pts,
  t2m: x.t2[0], t2a: x.t2[1], t3m: x.t3[0], t3a: x.t3[1], tlm: x.tl[0], tla: x.tl[1],
  reb: x.reb, ast: x.ast, rec: x.rec, per: x.per, tap: x.tap, fc: x.fc, fr: x.fr, val: x.val, pm: x.pm })));

const list = () => db.prepare('SELECT * FROM stats').all().map(r => ({
  match: r.partido, team: r.equipo, n: r.dorsal, name: r.jugador, min: r.minutos, pts: r.pts,
  t2: [r.t2m, r.t2a], t3: [r.t3m, r.t3a], tl: [r.tlm, r.tla],
  reb: r.reb, ast: r.ast, rec: r.rec, per: r.per, tap: r.tap, fc: r.fc, fr: r.fr, val: r.val, pm: r.pm }));

const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

http.createServer((req, res) => {
  if (req.url === '/api/stats') {
    if (req.method === 'GET') return json(res, 200, list());
    if (req.method === 'DELETE') { db.exec('DELETE FROM stats'); return json(res, 200, { ok: true }); }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => {
        try { saveAll(JSON.parse(body)); json(res, 200, { ok: true }); }
        catch (e) { json(res, 400, { error: e.message }); }
      });
      return;
    }
  }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
  }
  res.writeHead(404); res.end();
}).listen(process.env.PORT || 3000, '127.0.0.1', () => console.log('http://localhost:' + (process.env.PORT || 3000)));
