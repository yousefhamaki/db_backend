const bcrypt = require('bcryptjs');
const oracledb = require('oracledb');
const { withConnection } = require('../db/pool');
const { randomToken, hashToken, signAccessToken } = require('../utils/tokens');

const VERIFICATION_TTL_HOURS = 24;
const REFRESH_TTL_DAYS = 30;

async function signup(req, res, next) {
  try {
    const { userName, password, fullName, mobile, country } = req.body;
    if (!userName || !password) {
      return res.status(400).json({ error: 'userName and password are required' });
    }

    await withConnection(async (conn) => {
      const existing = await conn.execute(
        `SELECT USER_NAME FROM USERS WHERE USER_NAME = :userName`,
        { userName }
      );
      if (existing.rows.length) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const nextIdRes = await conn.execute(`SELECT NVL(MAX(USER_ID), 0) + 1 AS NEXT_ID FROM USERS`);
      const userId = nextIdRes.rows[0].NEXT_ID;

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = randomToken();

      await conn.execute(
        `INSERT INTO USERS
           (USER_NAME, MOBILE, FULL_NAME, PASSWORD, COUNTRY, USER_ID,
            EMAIL_VERIFIED, VERIFICATION_TOKEN, VERIFICATION_EXPIRY)
         VALUES
           (:userName, :mobile, :fullName, :password, :country, :userId,
            'N', :verificationToken, SYSDATE + :ttlHours / 24)`,
        {
          userName,
          mobile: mobile || null,
          fullName: fullName || null,
          password: passwordHash,
          country: country || null,
          userId,
          verificationToken,
          ttlHours: VERIFICATION_TTL_HOURS,
        },
        { autoCommit: true }
      );

      // No email provider wired up yet — log the verification link and return it
      // so the flow is testable. Remove `verificationToken` from the response
      // once real email delivery is added.
      console.log(`[verify-email] ${userName} -> token: ${verificationToken}`);

      res.status(201).json({
        message: 'Signup successful. Verify your email to activate your account.',
        userId,
        verificationToken,
      });
    });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `UPDATE USERS
         SET EMAIL_VERIFIED = 'Y', VERIFICATION_TOKEN = NULL, VERIFICATION_EXPIRY = NULL
         WHERE VERIFICATION_TOKEN = :token
           AND VERIFICATION_EXPIRY > SYSDATE
           AND EMAIL_VERIFIED = 'N'`,
        { token },
        { autoCommit: true }
      );

      if (result.rowsAffected === 0) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }
      res.json({ message: 'Email verified' });
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res.status(400).json({ error: 'userName and password are required' });
    }

    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT USER_NAME, PASSWORD, USER_ID, EMAIL_VERIFIED, FULL_NAME
         FROM USERS WHERE USER_NAME = :userName`,
        { userName }
      );
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const ok = await bcrypt.compare(password, user.PASSWORD);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.EMAIL_VERIFIED !== 'Y') {
        return res.status(403).json({ error: 'Email not verified' });
      }

      const accessToken = signAccessToken({ userId: user.USER_ID, userName: user.USER_NAME });
      const refreshToken = randomToken();
      const refreshHash = hashToken(refreshToken);

      await conn.execute(
        `INSERT INTO REFRESH_TOKENS (USER_ID, TOKEN_HASH, EXPIRES_AT)
         VALUES (:userId, :tokenHash, SYSDATE + :ttlDays)`,
        { userId: user.USER_ID, tokenHash: refreshHash, ttlDays: REFRESH_TTL_DAYS },
        { autoCommit: true }
      );

      res.json({
        accessToken,
        refreshToken,
        user: { userId: user.USER_ID, userName: user.USER_NAME, fullName: user.FULL_NAME },
      });
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    await withConnection(async (conn) => {
      const tokenHash = hashToken(refreshToken);
      const result = await conn.execute(
        `SELECT TOKEN_ID, USER_ID FROM REFRESH_TOKENS
         WHERE TOKEN_HASH = :tokenHash AND REVOKED = 'N' AND EXPIRES_AT > SYSDATE`,
        { tokenHash }
      );
      const row = result.rows[0];
      if (!row) return res.status(401).json({ error: 'Invalid or expired refresh token' });

      const userRes = await conn.execute(
        `SELECT USER_NAME FROM USERS WHERE USER_ID = :userId`,
        { userId: row.USER_ID }
      );
      const userName = userRes.rows[0].USER_NAME;

      // rotate: revoke the used refresh token, issue a new one
      await conn.execute(
        `UPDATE REFRESH_TOKENS SET REVOKED = 'Y' WHERE TOKEN_ID = :tokenId`,
        { tokenId: row.TOKEN_ID }
      );
      const newRefreshToken = randomToken();
      await conn.execute(
        `INSERT INTO REFRESH_TOKENS (USER_ID, TOKEN_HASH, EXPIRES_AT)
         VALUES (:userId, :tokenHash, SYSDATE + :ttlDays)`,
        { userId: row.USER_ID, tokenHash: hashToken(newRefreshToken), ttlDays: REFRESH_TTL_DAYS },
        { autoCommit: true }
      );

      const accessToken = signAccessToken({ userId: row.USER_ID, userName });
      res.json({ accessToken, refreshToken: newRefreshToken });
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    await withConnection(async (conn) => {
      await conn.execute(
        `UPDATE REFRESH_TOKENS SET REVOKED = 'Y' WHERE TOKEN_HASH = :tokenHash`,
        { tokenHash: hashToken(refreshToken) },
        { autoCommit: true }
      );
      res.json({ message: 'Logged out' });
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, verifyEmail, login, refresh, logout };
