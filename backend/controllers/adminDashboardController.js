import { getPool } from '../config/db.js';
import { addRequiredTurnover, syncWalletBalance } from '../services/userWalletService.js';

function formatChartDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function buildLast7Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({
      date: formatChartDate(date),
      isoDate: date.toISOString().slice(0, 10),
      count: 0,
      deposit: 0,
      withdraw: 0,
    });
  }

  return days;
}

export async function getDashboardStats(req, res) {
  const pool = getPool();

  try {
    const [[{ totalUsers }]] = await pool.query(
      `SELECT COUNT(*) AS totalUsers FROM users WHERE role = 'user'`,
    );

    const [[{ totalDeposit }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalDeposit
       FROM transactions
       WHERE type = 'deposit' AND status = 'approved'`,
    );

    const [[{ totalWithdraw }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS totalWithdraw
       FROM transactions
       WHERE type = 'withdraw' AND status = 'approved'`,
    );

    const [[{ todayTx }]] = await pool.query(
      `SELECT COUNT(*) AS todayTx
       FROM transactions
       WHERE DATE(created_at) = CURDATE()`,
    );

    const [dailyRows] = await pool.query(
      `SELECT
         DATE(created_at) AS txDate,
         COUNT(*) AS count,
         COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END), 0) AS deposit,
         COALESCE(SUM(CASE WHEN type = 'withdraw' AND status = 'approved' THEN amount ELSE 0 END), 0) AS withdraw
       FROM transactions
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY txDate ASC`,
    );

    const dailyTransactions = buildLast7Days();
    const rowByDate = new Map(
      dailyRows.map((row) => [
        new Date(row.txDate).toISOString().slice(0, 10),
        {
          count: Number(row.count),
          deposit: Number(row.deposit),
          withdraw: Number(row.withdraw),
        },
      ]),
    );

    dailyTransactions.forEach((day) => {
      const values = rowByDate.get(day.isoDate);
      day.count = values?.count ?? 0;
      day.deposit = values?.deposit ?? 0;
      day.withdraw = values?.withdraw ?? 0;
      delete day.isoDate;
    });

    return res.json({
      totalUsers: Number(totalUsers),
      totalDeposit: Number(totalDeposit),
      totalWithdraw: Number(totalWithdraw),
      todayTx: Number(todayTx),
      dailyTransactions,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}

export async function updateTransactionStatus(req, res) {
  const pool = getPool();
  const transactionId = Number(req.params.id);
  const status = String(req.body.status || '').trim();

  if (!transactionId || !['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid transaction id or status' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, user_id, type, amount, status
       FROM transactions
       WHERE id = ?
       FOR UPDATE`,
      [transactionId],
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = rows[0];
    const previousStatus = transaction.status;

    if (previousStatus === status) {
      await connection.commit();
      return res.json({ success: true, transaction });
    }

    if (previousStatus === 'approved') {
      if (transaction.type === 'deposit') {
        await connection.query(
          `UPDATE users SET balance = balance - ? WHERE id = ?`,
          [transaction.amount, transaction.user_id],
        );
      } else if (transaction.type === 'withdraw') {
        await connection.query(
          `UPDATE users SET balance = balance + ? WHERE id = ?`,
          [transaction.amount, transaction.user_id],
        );
      }
    }

    if (status === 'approved') {
      if (transaction.type === 'deposit') {
        await connection.query(
          `UPDATE users SET balance = balance + ? WHERE id = ?`,
          [transaction.amount, transaction.user_id],
        );
        await addRequiredTurnover(
          transaction.user_id,
          transaction.amount,
          'deposit',
          connection,
        );
      } else if (transaction.type === 'withdraw') {
        const [[user]] = await connection.query(
          `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
          [transaction.user_id],
        );

        if (Number(user.balance) < Number(transaction.amount)) {
          await connection.rollback();
          return res.status(400).json({ error: 'Insufficient user balance' });
        }

        await connection.query(
          `UPDATE users SET balance = balance - ? WHERE id = ?`,
          [transaction.amount, transaction.user_id],
        );
      }
    }

    const approvedAt = status === 'approved' ? new Date() : null;

    await connection.query(
      `UPDATE transactions
       SET status = ?, approved_at = ?
       WHERE id = ?`,
      [status, approvedAt, transactionId],
    );

    await connection.commit();

    await syncWalletBalance(transaction.user_id);

    return res.json({
      success: true,
      transaction: {
        ...transaction,
        status,
        approved_at: approvedAt,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Transaction status update error:', error);
    return res.status(500).json({ error: 'Failed to update transaction' });
  } finally {
    connection.release();
  }
}

export async function getGameReports(req, res) {
  const pool = getPool();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*) AS totalRounds,
         COALESCE(SUM(bet_amount), 0) AS totalBet,
         COALESCE(SUM(win_amount), 0) AS totalWin,
         COALESCE(SUM(net_amount), 0) AS totalNet
       FROM game_rounds
       WHERE status = 'settled'`,
    );

    const [[sessionSummary]] = await pool.query(
      `SELECT COUNT(*) AS totalSessions FROM game_sessions`,
    );

    const [topGames] = await pool.query(
      `SELECT g.name AS gameName, p.name AS providerName,
              COUNT(gr.id) AS rounds,
              COALESCE(SUM(gr.bet_amount), 0) AS totalBet,
              COALESCE(SUM(gr.win_amount), 0) AS totalWin
       FROM game_rounds gr
       INNER JOIN games g ON g.id = gr.game_id
       INNER JOIN providers p ON p.id = gr.provider_id
       WHERE gr.status = 'settled'
       GROUP BY g.id, g.name, p.name
       ORDER BY rounds DESC
       LIMIT 10`,
    );

    const [recentRounds] = await pool.query(
      `SELECT gr.id, gr.round_id AS roundId, gr.bet_amount AS betAmount,
              gr.win_amount AS winAmount, gr.net_amount AS netAmount, gr.status,
              gr.created_at AS createdAt,
              u.username, u.phone,
              g.name AS gameName, p.name AS providerName
       FROM game_rounds gr
       INNER JOIN users u ON u.id = gr.user_id
       INNER JOIN games g ON g.id = gr.game_id
       INNER JOIN providers p ON p.id = gr.provider_id
       ORDER BY gr.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM game_rounds`);

    return res.json({
      summary: {
        totalSessions: Number(sessionSummary.totalSessions),
        totalRounds: Number(summary.totalRounds),
        totalBet: Number(summary.totalBet),
        totalWin: Number(summary.totalWin),
        totalNet: Number(summary.totalNet),
      },
      topGames: topGames.map((row) => ({
        gameName: row.gameName,
        providerName: row.providerName,
        rounds: Number(row.rounds),
        totalBet: Number(row.totalBet),
        totalWin: Number(row.totalWin),
      })),
      recentRounds,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    });
  } catch (error) {
    console.error('Game reports error:', error);
    return res.status(500).json({ error: 'Failed to fetch game reports' });
  }
}

export default getDashboardStats;
