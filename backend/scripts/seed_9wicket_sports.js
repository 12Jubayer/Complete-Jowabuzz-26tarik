import 'dotenv/config';
import { connectDatabase } from '../config/db.js';

await connectDatabase();
const pool = (await import('../config/db.js')).getPool();

await pool.query(`UPDATE providers SET enabled=1, status='active', name='9Wicket', provider_logo='/images/providers/9w.svg' WHERE code='9W'`);

const [[provider]] = await pool.query(`SELECT id FROM providers WHERE code='9W' LIMIT 1`);
if (!provider) {
  console.log('NO_PROVIDER');
  process.exit(1);
}

const gameCode = '48341a3bf62b6dd0814d7129e7e0834b';
const gameImage = '/images/providers/9w.svg';

const [[existing]] = await pool.query(
  `SELECT id FROM games WHERE provider_id=? AND category='sports' LIMIT 1`,
  [provider.id],
);

if (existing) {
  await pool.query(
    `UPDATE games SET code=?, name='9WICKET SPORTS', category='sports', game_type='SPORTS',
      image_url=?, status='active', is_active=1
     WHERE id=?`,
    [gameCode, gameImage, existing.id],
  );
  console.log('UPDATED', existing.id);
} else {
  const [result] = await pool.query(
    `INSERT INTO games (provider_id, code, name, category, game_type, image_url, min_bet, status, is_hot, is_featured, is_live, is_active, sort_order)
     VALUES (?, ?, '9WICKET SPORTS', 'sports', 'SPORTS', ?, 10.00, 'active', 0, 0, 0, 1, 5)`,
    [provider.id, gameCode, gameImage],
  );
  console.log('INSERTED', result.insertId);
}

const [rows] = await pool.query(
  `SELECT g.id,g.name,p.code,p.enabled,p.status AS provider_status FROM games g JOIN providers p ON p.id=g.provider_id WHERE p.code='9W'`,
);
console.log(JSON.stringify(rows));
process.exit(0);
