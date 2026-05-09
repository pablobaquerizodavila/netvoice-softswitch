CREATE TABLE IF NOT EXISTS cdr (
  calldate    DATETIME      NOT NULL DEFAULT '0000-00-00 00:00:00',
  clid        VARCHAR(80)   NOT NULL DEFAULT '',
  src         VARCHAR(80)   NOT NULL DEFAULT '',
  dst         VARCHAR(80)   NOT NULL DEFAULT '',
  dcontext    VARCHAR(80)   NOT NULL DEFAULT '',
  channel     VARCHAR(80)   NOT NULL DEFAULT '',
  dstchannel  VARCHAR(80)   NOT NULL DEFAULT '',
  lastapp     VARCHAR(80)   NOT NULL DEFAULT '',
  lastdata    VARCHAR(80)   NOT NULL DEFAULT '',
  duration    INT(11)       NOT NULL DEFAULT 0,
  billsec     INT(11)       NOT NULL DEFAULT 0,
  disposition VARCHAR(45)   NOT NULL DEFAULT '',
  amaflags    INT(11)       NOT NULL DEFAULT 0,
  accountcode VARCHAR(20)   NOT NULL DEFAULT '',
  uniqueid    VARCHAR(32)   NOT NULL DEFAULT '',
  userfield   VARCHAR(255)  NOT NULL DEFAULT ''
);
