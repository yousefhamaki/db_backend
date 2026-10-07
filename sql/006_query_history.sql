-- Migration: SQL editor query history, stored per user.
-- SQL_TEXT is an NCLOB, not a CLOB: this database's character set is AR8MSWIN1256, which
-- would silently replace anything outside Windows-1256 (emoji, Chinese, symbols) with "?".
-- Oracle cannot put a LOB in a unique constraint, so uniqueness is enforced on SQL_HASH,
-- the SHA-256 hex of the trimmed SQL text.
-- EXECUTED_AT holds a UTC wall-clock timestamp, written and read as ISO-8601 strings by the app.

CREATE TABLE QUERY_HISTORY (
  HISTORY_ID     VARCHAR2(36) PRIMARY KEY,
  USER_ID        NUMBER NOT NULL,
  SQL_TEXT       NCLOB NOT NULL,
  SQL_HASH       VARCHAR2(64) NOT NULL,
  DATABASE_USER  VARCHAR2(30) NOT NULL,
  SITE_NAME      VARCHAR2(50),
  EXECUTED_AT    TIMESTAMP(3) NOT NULL,
  CONSTRAINT FK_QUERY_HISTORY_USER FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID),
  CONSTRAINT UQ_QUERY_HISTORY_ENTRY UNIQUE (USER_ID, DATABASE_USER, SQL_HASH)
);
