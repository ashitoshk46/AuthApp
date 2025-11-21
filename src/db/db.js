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

export async function runDbAction(action, container, params) {
  switch (action) {
    case dbActions.CREATE_TABLE:
      // console.log('Creating table:', container, params);
      // return createTable(container, params.columns);
      
      console.log(`Table: ${container}`);

      const columns = params.columns.map((col) => {
        return buildColumnType(col.type, col);
      })
      const constraints = buildTable(params);
      
      console.log(`CREATE TABLE IF NOT EXISTS ${container} (\n  ${columns.join(',\n  ')}${constraints ? ',\n  ' + constraints : ''}\n);`);
      
      const ret = await executeCommand(`CREATE TABLE IF NOT EXISTS ${container} (\n  ${columns.join(',\n  ')}${constraints ? ',\n  ' + constraints : ''}\n);`);
      
      return;
    case dbActions.DELETE_TABLE:
      return deleteTable(container);
    case dbActions.ADD_COLUMN:
      return await executeCommand(params);
    case dbActions.DELETE_COLUMN:
      return deleteColumn(container, params.name);
    case dbActions.UPDATE_TYPE:
      return updateColumnType(container, params.name, params.type);
    default:
      throw new Error(`Unsupported DB action: ${action}`);
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
