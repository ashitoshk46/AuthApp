import { dbTypes } from '../db/column/dbTypes.js';
import { buildColumnType } from '../db/column/columnParsing.js';
import { schemas } from '../db/schema.full.js';
import { buildTable } from '../db/table/tableParsing.js';


for (const [tableName, schema] of Object.entries(schemas)) {
    console.log("testing ...")
    
    let columns = {}
    schema.columns.forEach((col) => {
        // console.log('col: ', col.name)
        columns[col.name] = buildColumnType(col.type, col);
    })

    const constraints = buildTable(schema);
    console.log(`${tableName} : `, columns);
    
    console.log(`  Constraints: ${constraints}`);

    // console.log(`CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.join(',\n  ')}${constraints ? ',\n  ' + constraints : ''}\n);`);
    
    // CREATE TABLE [IF NOT EXISTS]
}

const customeTests = false;

if (customeTests) {

    // VARCHAR with length and NOT NULL
    console.log(buildColumnType(dbTypes.STRING, { length: 255, notNull: true }));
    // Output: "character varying(255) not null"

    // DECIMAL with precision and scale
    console.log(buildColumnType(dbTypes.DECIMAL, { precision: 12, scale: 4 }));
    // Output: "numeric(12, 4)"

    // Foreign key reference
    console.log(buildColumnType(dbTypes.REFERENCE, { refTable: 'users', refColumn: 'id', notNull: true }));
    // Output: "integer references users(id) not null"

    // ID column with primary key
    console.log(buildColumnType(dbTypes.ID, { primary: true }));
    // Output: "integer generated always as identity primary key"

    // Default value example
    console.log(buildColumnType(dbTypes.BOOLEAN, { default: false }));
    // Output: "boolean default false"

    // TIMESTAMP with CURRENT_TIMESTAMP
    console.log(buildColumnType(dbTypes.TIMESTAMP, { current: true }));
    // "timestamp default CURRENT_TIMESTAMP"

    // UUID without default
    console.log(buildColumnType(dbTypes.UUID));
    // "uuid"

    // UUID with explicit function default
    console.log(buildColumnType(dbTypes.UUID, { default: 'uuid_generate_v4()' }));
    // "uuid default uuid_generate_v4()"

    // Column-level CHECK
    console.log(buildColumnType(dbTypes.INTEGER, { check: 'value > 0', notNull: true }));
    // "integer not null check (value > 0)"

}