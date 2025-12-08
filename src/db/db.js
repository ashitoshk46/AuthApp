import { Pool } from 'pg';
import { dbActions } from './dbActions.js';
import { buildTable } from './table/tableParsing.js';
import { buildColumnType } from './column/columnParsing.js';


let pool = null;

export const initializeDb = () => {
  if (!pool) {
    console.log();
    console.log('=> Initializing database pool ...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      ssl: { rejectUnauthorized: false },
      max: 10, // max connections
      idleTimeoutMillis: 30000 // 30s idle timeout
    });
    console.log('>> Database pool initialized.');
  }
}

export const getPool = () => pool;


export async function executeCommand(sql) {
  await pool.query(sql);
  console.log(`Executed: ${sql}`);
}

// example drop-in extension for runDbAction (adjust imports/logger/db client)
export async function runDbAction(action, container, params) {
  // container = table name
  // params = either a string SQL (simple) or object { sql, ... } for richer actions
  let sql = null;

  // If params is a string, treat as raw SQL (backwards compatible)
  if (typeof params === 'string') {
    sql = params;
  } else if (params && params.sql) {
    sql = params.sql;
  } else {
    switch (action) {
      case dbActions.ADD_COLUMN:
        // params: { sql: 'ALTER TABLE ...' } or you can construct
        sql = params.sql ?? `ALTER TABLE ${container} ADD COLUMN ${params.definition};`;
        break;

      case dbActions.DELETE_COLUMN:
        sql = params.sql ?? `ALTER TABLE ${container} DROP COLUMN ${params.name} CASCADE;`;
        break;

      case dbActions.ALTER_TYPE:
        // params: { column, type, using }
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} TYPE ${params.type} USING (${params.using ?? `${params.column}::${params.type.split('(')[0]}`});`;
        break;

      case dbActions.SET_DEFAULT:
        // params: { column, defaultValue }
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} SET DEFAULT ${params.defaultValue};`;
        break;

      case dbActions.DROP_DEFAULT:
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} DROP DEFAULT;`;
        break;

      case dbActions.SET_NOT_NULL:
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} SET NOT NULL;`;
        break;

      case dbActions.DROP_NOT_NULL:
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} DROP NOT NULL;`;
        break;

      case dbActions.ADD_PRIMARY_KEY:
        // params: { cols: ['id'] }
        sql = params.sql ?? `ALTER TABLE ${container} ADD CONSTRAINT ${container}_pkey PRIMARY KEY (${params.cols.join(', ')});`;
        break;

      case dbActions.DROP_PRIMARY_KEY:
        sql = params.sql ?? `ALTER TABLE ${container} DROP CONSTRAINT ${params.constraintName};`;
        break;

      case dbActions.ADD_UNIQUE:
        // params: { cols: ['email'], name?: 'tbl_email_uniq' }
        sql = params.sql ?? `ALTER TABLE ${container} ADD CONSTRAINT ${params.name ?? `${container}_${params.cols.join('_')}_uniq`} UNIQUE (${params.cols.join(', ')});`;
        break;

      case dbActions.DROP_UNIQUE:
        sql = params.sql ?? `ALTER TABLE ${container} DROP CONSTRAINT ${params.constraintName};`;
        break;

      case dbActions.ADD_FOREIGN_KEY:
        // params: { column, refTable, refColumn, onDelete }
        sql = params.sql ?? `ALTER TABLE ${container} ADD CONSTRAINT ${container}_${params.column}_fkey FOREIGN KEY (${params.column}) REFERENCES ${params.refTable}(${params.refColumn}) ON DELETE ${params.onDelete ?? 'NO ACTION'};`;
        break;

      case dbActions.DROP_FOREIGN_KEY:
        sql = params.sql ?? `ALTER TABLE ${container} DROP CONSTRAINT ${params.constraintName};`;
        break;

      case dbActions.ADD_IDENTITY:
        // params: { column, mode: 'BY DEFAULT'|'ALWAYS' }
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} ADD GENERATED ${params.mode ?? 'BY DEFAULT'} AS IDENTITY;`;
        break;

      case dbActions.DROP_IDENTITY:
        sql = params.sql ?? `ALTER TABLE ${container} ALTER COLUMN ${params.column} DROP IDENTITY IF EXISTS;`;
        break;

      case dbActions.RENAME_COLUMN:
        sql = params.sql ?? `ALTER TABLE ${container} RENAME COLUMN ${params.from} TO ${params.to};`;
        break;

      case dbActions.RENAME_TABLE:
        sql = params.sql ?? `ALTER TABLE ${container} RENAME TO ${params.to};`;
        break;

      default:
        throw new Error(`Unknown DB action: ${action}`);
    }
  }

  if (!sql) {
    throw new Error(`No SQL generated for action ${action}`);
  }

  // Execute SQL
  try {
    console.log(`[runDbAction] executing: ${sql}`);
    const res = await getPool().query(sql);
    return res;
  } catch (err) {
    console.error(`[runDbAction] failed for ${action} on ${container}:`, err.message || err);
    throw err;
  }
}


async function createTable(tableName, columns) {
  const columnDefs = Object.entries(columns)
    .map(([name, props]) => `${name} ${props.type}${props.notNull ? ' NOT NULL' : ''}${props.unique ? ' UNIQUE' : ''}`)
    .join(', ');
  const sql = `CREATE TABLE ${tableName} (${columnDefs})`;
  console.log('Creating table with SQL:', sql);
  await executeCommand(sql);
}

async function deleteTable(tableName) {
  const sql = `DROP TABLE ${tableName}`;
  await executeCommand(sql);
}

async function deleteColumn(tableName, columnName) {
  const sql = `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
  await executeCommand(sql);
}

async function updateColumnType(tableName, columnName, newType) {
  const sql = `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${newType}`;
  await executeCommand(sql);
}
