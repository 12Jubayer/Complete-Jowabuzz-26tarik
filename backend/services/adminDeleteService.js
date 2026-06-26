import { getPool } from '../config/db.js';

async function safeQuery(connection, sql, params = []) {
  try {
    const [result] = await connection.query(sql, params);
    return result;
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return { affectedRows: 0 };
    }
    throw error;
  }
}

export async function fetchSubAdminForDeletion(connection, adminId) {
  const [[admin]] = await connection.query(
    `SELECT id, name, email, role, status
     FROM admins
     WHERE id = ?
     LIMIT 1`,
    [adminId],
  );

  if (!admin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  if (admin.role === 'super_admin') {
    const error = new Error('Super admin cannot be deleted');
    error.statusCode = 400;
    throw error;
  }

  return admin;
}

async function clearSubAdminReferences(connection, adminId) {
  await safeQuery(connection, `UPDATE admin_audit_logs SET admin_id = NULL WHERE admin_id = ?`, [
    adminId,
  ]);
  await safeQuery(
    connection,
    `UPDATE movecash_app_links SET created_by_admin_id = NULL WHERE created_by_admin_id = ?`,
    [adminId],
  );
}

export async function permanentlyDeleteSubAdmin(adminId) {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const admin = await fetchSubAdminForDeletion(connection, adminId);
    await clearSubAdminReferences(connection, admin.id);

    const [result] = await connection.query(
      `DELETE FROM admins WHERE id = ? AND role <> 'super_admin'`,
      [admin.id],
    );

    if (!result.affectedRows) {
      const error = new Error('Failed to delete sub admin');
      error.statusCode = 500;
      throw error;
    }

    await connection.commit();

    return {
      success: true,
      deletedAdminId: admin.id,
      deletedEmail: admin.email,
      deletedName: admin.name,
      deletedRows: result.affectedRows,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cleanupSoftDeletedAdmins() {
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id FROM admins WHERE status = 'deleted' AND role <> 'super_admin'`,
    );

    let removed = 0;
    for (const row of rows) {
      await clearSubAdminReferences(connection, row.id);
      const [result] = await connection.query(
        `DELETE FROM admins WHERE id = ? AND role <> 'super_admin'`,
        [row.id],
      );
      removed += Number(result.affectedRows || 0);
    }

    await connection.commit();
    return { removed };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  permanentlyDeleteSubAdmin,
  cleanupSoftDeletedAdmins,
  fetchSubAdminForDeletion,
};
