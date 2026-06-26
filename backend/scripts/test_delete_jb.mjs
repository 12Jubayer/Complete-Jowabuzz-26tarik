
import { getPool } from '../config/db.js';
import { permanentlyDeletePlayer } from '../services/adminPlayerService.js';

const pool = getPool();
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();
  const result = await permanentlyDeletePlayer(conn, 52);
  await conn.commit();
  console.log(JSON.stringify({ ok: true, result }, null, 2));
} catch (e) {
  await conn.rollback();
  console.log(JSON.stringify({
    ok: false,
    message: e.message,
    code: e.code,
    sqlMessage: e.sqlMessage,
    errno: e.errno,
  }, null, 2));
} finally {
  conn.release();
  await pool.end();
}
