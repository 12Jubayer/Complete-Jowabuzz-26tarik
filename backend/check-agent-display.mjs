import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '/www/wwwroot/jowabuzz/backend/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [agents] = await pool.query(
  `SELECT id, balance, name, mobile FROM agents WHERE mobile = '01344444444' OR name = 'ajk' LIMIT 3`,
);

for (const agent of agents) {
  const id = agent.id;
  const [tx] = await pool.query(
    `SELECT type, amount, status, user_id FROM agent_transactions WHERE agent_id = ? ORDER BY id DESC LIMIT 10`,
    [id],
  );

  const [[dep]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS t FROM agent_transactions
     WHERE agent_id = ? AND user_id IS NOT NULL
       AND type IN ('topup_player', 'deposit') AND status IN ('approved', 'completed')`,
    [id],
  );
  const [[top]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS t FROM agent_transactions
     WHERE agent_id = ? AND user_id IS NOT NULL
       AND type = 'topup_player' AND status IN ('approved', 'completed')`,
    [id],
  );
  const [[wd]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS t FROM agent_transactions
     WHERE agent_id = ? AND user_id IS NOT NULL
       AND type = 'withdraw' AND status IN ('approved', 'completed')`,
    [id],
  );

  const wallet = Number(agent.balance);
  const D = Number(dep.t);
  const T = Number(top.t);
  const W = Number(wd.t);
  console.log({
    agent: { id, name: agent.name, mobile: agent.mobile, wallet },
    D,
    T,
    W,
    formula: wallet + D + W + T,
    tx,
  });
}

await pool.end();
