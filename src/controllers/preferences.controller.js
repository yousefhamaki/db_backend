const { withConnection } = require('../db/pool');

const DEFAULTS = {
  appearance: 'light',
  accentColor: 'blue',
  contentLayoutMode: 'list',
  fontSize: 'medium',
  rowsPerPage: 50,
  confirmBeforeDelete: true,
  useMonospacedData: false,
  showRowSeparators: true,
  useBoldText: false,
};

const ENUM_FIELDS = {
  appearance: ['light', 'dark'],
  contentLayoutMode: ['grid', 'list'],
  fontSize: ['small', 'medium', 'large'],
};

const BOOLEAN_FIELDS = ['confirmBeforeDelete', 'useMonospacedData', 'showRowSeparators', 'useBoldText'];

function fromDbRow(row) {
  return {
    appearance: row.APPEARANCE,
    accentColor: row.ACCENT_COLOR,
    contentLayoutMode: row.CONTENT_LAYOUT_MODE,
    fontSize: row.FONT_SIZE,
    rowsPerPage: row.ROWS_PER_PAGE,
    confirmBeforeDelete: row.CONFIRM_BEFORE_DELETE === 'Y',
    useMonospacedData: row.USE_MONOSPACED_DATA === 'Y',
    showRowSeparators: row.SHOW_ROW_SEPARATORS === 'Y',
    useBoldText: row.USE_BOLD_TEXT === 'Y',
  };
}

function validate(body) {
  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (body[field] !== undefined && !allowed.includes(body[field])) {
      return `${field} must be one of: ${allowed.join(', ')}`;
    }
  }
  for (const field of BOOLEAN_FIELDS) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      return `${field} must be a boolean`;
    }
  }
  if (body.rowsPerPage !== undefined) {
    const n = Number(body.rowsPerPage);
    if (!Number.isInteger(n) || n <= 0) return 'rowsPerPage must be a positive integer';
  }
  if (body.accentColor !== undefined && typeof body.accentColor !== 'string') {
    return 'accentColor must be a string';
  }
  return null;
}

async function get(req, res, next) {
  try {
    await withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT APPEARANCE, ACCENT_COLOR, CONTENT_LAYOUT_MODE, FONT_SIZE, ROWS_PER_PAGE,
                CONFIRM_BEFORE_DELETE, USE_MONOSPACED_DATA, SHOW_ROW_SEPARATORS, USE_BOLD_TEXT
         FROM USER_PREFERENCES WHERE USER_ID = :userId`,
        { userId: req.user.userId }
      );
      if (!result.rows.length) return res.json(DEFAULTS);
      res.json(fromDbRow(result.rows[0]));
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    await withConnection(async (conn) => {
      const existing = await conn.execute(
        `SELECT APPEARANCE, ACCENT_COLOR, CONTENT_LAYOUT_MODE, FONT_SIZE, ROWS_PER_PAGE,
                CONFIRM_BEFORE_DELETE, USE_MONOSPACED_DATA, SHOW_ROW_SEPARATORS, USE_BOLD_TEXT
         FROM USER_PREFERENCES WHERE USER_ID = :userId`,
        { userId: req.user.userId }
      );
      const current = existing.rows.length ? fromDbRow(existing.rows[0]) : DEFAULTS;
      const merged = { ...current, ...req.body };

      await conn.execute(
        `MERGE INTO USER_PREFERENCES p
         USING (SELECT :userId AS USER_ID FROM dual) s
         ON (p.USER_ID = s.USER_ID)
         WHEN MATCHED THEN UPDATE SET
           APPEARANCE = :appearance,
           ACCENT_COLOR = :accentColor,
           CONTENT_LAYOUT_MODE = :contentLayoutMode,
           FONT_SIZE = :fontSize,
           ROWS_PER_PAGE = :rowsPerPage,
           CONFIRM_BEFORE_DELETE = :confirmBeforeDelete,
           USE_MONOSPACED_DATA = :useMonospacedData,
           SHOW_ROW_SEPARATORS = :showRowSeparators,
           USE_BOLD_TEXT = :useBoldText,
           UPDATED_AT = SYSDATE
         WHEN NOT MATCHED THEN INSERT
           (USER_ID, APPEARANCE, ACCENT_COLOR, CONTENT_LAYOUT_MODE, FONT_SIZE, ROWS_PER_PAGE,
            CONFIRM_BEFORE_DELETE, USE_MONOSPACED_DATA, SHOW_ROW_SEPARATORS, USE_BOLD_TEXT)
         VALUES
           (:userId, :appearance, :accentColor, :contentLayoutMode, :fontSize, :rowsPerPage,
            :confirmBeforeDelete, :useMonospacedData, :showRowSeparators, :useBoldText)`,
        {
          userId: req.user.userId,
          appearance: merged.appearance,
          accentColor: merged.accentColor,
          contentLayoutMode: merged.contentLayoutMode,
          fontSize: merged.fontSize,
          rowsPerPage: merged.rowsPerPage,
          confirmBeforeDelete: merged.confirmBeforeDelete ? 'Y' : 'N',
          useMonospacedData: merged.useMonospacedData ? 'Y' : 'N',
          showRowSeparators: merged.showRowSeparators ? 'Y' : 'N',
          useBoldText: merged.useBoldText ? 'Y' : 'N',
        },
        { autoCommit: true }
      );

      res.json(merged);
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { get, update };
