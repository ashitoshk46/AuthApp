export const dbTypes = Object.freeze({
    ID: 'ID',
    INTEGER: 'INTEGER',
    SMALLINT: 'SMALLINT',
    BIGINT: 'BIGINT',
    STRING: 'STRING',
    TEXT: 'TEXT',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    TIMESTAMP: 'TIMESTAMP',
    FLOAT: 'FLOAT',
    DOUBLE: 'DOUBLE',
    DECIMAL: 'DECIMAL',
    JSON: 'JSON',
    JSONB: 'JSONB',
    UUID: 'UUID',
    BLOB: 'BLOB',
    REFERENCE: 'REFERENCE'
});

export const typeMappings = Object.freeze({
    [dbTypes.ID]: 'integer generated always as identity',
    [dbTypes.INTEGER]: 'integer',
    [dbTypes.SMALLINT]: 'smallint',
    [dbTypes.BIGINT]: 'bigint',
    [dbTypes.STRING]: 'character varying', // internal type
    [dbTypes.TEXT]: 'text',
    [dbTypes.BOOLEAN]: 'boolean',
    [dbTypes.DATE]: 'date',
    [dbTypes.TIMESTAMP]: 'timestamp without time zone',
    [dbTypes.FLOAT]: 'real',
    [dbTypes.DOUBLE]: 'double precision',
    [dbTypes.DECIMAL]: 'numeric', // internal name for decimal
    [dbTypes.JSON]: 'json',
    [dbTypes.JSONB]: 'jsonb',
    [dbTypes.UUID]: 'uuid',
    [dbTypes.BLOB]: 'bytea',
    [dbTypes.REFERENCE]: 'integer references' // dynamic part will add table/column
});

export const typeMappingsReverse =  Object.freeze(
  Object.fromEntries(
    Object.entries(typeMappings).map(([key, value]) => [value, key])
  )
);

