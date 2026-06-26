import mysql from 'mysql2/promise';

let pool = null;

export function getPool() {
  return pool;
}

export function isDatabaseConnected() {
  return !!pool;
}

export async function connectDatabase() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'bangla12@';
  const database = process.env.DB_NAME || 'jowabuzz';
  const port = Number(process.env.DB_PORT || 3306);

  try {
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });

    await pool.query('SELECT 1');
    console.log(`MySQL connected (${host}:${port}/${database})`);
    return pool;
  } catch (error) {
    pool = null;
    throw new Error(error.message || 'Unable to connect to MySQL');
  }
}

export default connectDatabase;
