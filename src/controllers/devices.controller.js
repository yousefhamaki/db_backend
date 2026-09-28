const { withConnection } = require('../db/pool');

async function list(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT DEVICE_ID, DEVICE_NAME, DEVICE_IDENTIFIER, PLATFORM, REGISTERED_AT, LAST_SEEN, STATUS
         FROM DEVICES WHERE USER_ID = :userId ORDER BY REGISTERED_AT`,
        { userId: req.user.userId }
      );
      res.json(result.rows);
    });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT DEVICE_ID, DEVICE_NAME, DEVICE_IDENTIFIER, PLATFORM, REGISTERED_AT, LAST_SEEN, STATUS
         FROM DEVICES WHERE DEVICE_ID = :deviceId AND USER_ID = :userId`,
        { deviceId: req.params.id, userId: req.user.userId }
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { deviceName, deviceIdentifier, platform } = req.body;
    if (!deviceIdentifier) {
      return res.status(400).json({ error: 'deviceIdentifier is required' });
    }

    await withConnection(async (conn) => {
      const planRes = await conn.execute(
        `SELECT p.NO_OF_USERS
         FROM USER_PLANS up
         JOIN PLANS p ON p.PLAN_ID = TO_NUMBER(up.PLAN_ID)
         WHERE up.USER_ID = :userId AND up.EXPIRY_DATE > SYSDATE
         ORDER BY up.EXPIRY_DATE DESC
         FETCH FIRST 1 ROW ONLY`,
        { userId: req.user.userId }
      );

      if (!planRes.rows.length) {
        return res.status(403).json({ error: 'No active plan; cannot register a device' });
      }
      const deviceLimit = Number(planRes.rows[0].NO_OF_USERS);

      const countRes = await conn.execute(
        `SELECT COUNT(*) AS CNT FROM DEVICES WHERE USER_ID = :userId AND STATUS = 'ACTIVE'`,
        { userId: req.user.userId }
      );
      const currentCount = countRes.rows[0].CNT;

      if (currentCount >= deviceLimit) {
        return res.status(403).json({
          error: `Device limit reached (${currentCount}/${deviceLimit}) for your current plan`,
        });
      }

      const insertRes = await conn.execute(
        `INSERT INTO DEVICES (USER_ID, DEVICE_NAME, DEVICE_IDENTIFIER, PLATFORM)
         VALUES (:userId, :deviceName, :deviceIdentifier, :platform)
         RETURNING DEVICE_ID INTO :deviceId`,
        {
          userId: req.user.userId,
          deviceName: deviceName || null,
          deviceIdentifier,
          platform: platform || null,
          deviceId: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        },
        { autoCommit: true }
      );

      res.status(201).json({ message: 'Device registered', deviceId: insertRes.outBinds.deviceId[0] });
    });
  } catch (err) {
    if (err.message && err.message.includes('ORA-00001')) {
      return res.status(409).json({ error: 'Device already registered for this user' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { deviceName, status, lastSeen } = req.body;
    const fields = [];
    const binds = { deviceId: req.params.id, userId: req.user.userId };

    if (deviceName !== undefined) { fields.push('DEVICE_NAME = :deviceName'); binds.deviceName = deviceName; }
    if (status !== undefined) { fields.push('STATUS = :status'); binds.status = status; }
    if (lastSeen) { fields.push('LAST_SEEN = SYSDATE'); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE DEVICES SET ${fields.join(', ')} WHERE DEVICE_ID = :deviceId AND USER_ID = :userId`,
        binds,
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Device updated' });
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `DELETE FROM DEVICES WHERE DEVICE_ID = :deviceId AND USER_ID = :userId`,
        { deviceId: req.params.id, userId: req.user.userId },
        { autoCommit: true }
      );
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
