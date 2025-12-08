// server/db/normalizeColumnSpec.js
// Defensive normalizer + comparator for Postgres information_schema rows
// Exported functions:
//  - normalizeSpecFromSchema(colName, colObj)
//  - normalizeSpecFromDb(row)
//  - compareColumnSpec(a, b)

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function normalizeType(typeRaw) {
  const t = safeStr(typeRaw).trim().toLowerCase();
  if (!t) return null;
  // common PG normalizations
  if (t.startsWith('character varying')) return 'varchar';
  if (t === 'character' || t === 'character varying') return 'varchar';
  if (t === 'timestamp without time zone' || t === 'timestamp with time zone' || t.startsWith('timestamp')) return 'timestamp';
  if (t === 'integer') return 'int';
  if (t === 'bigint') return 'bigint';
  if (t === 'double precision') return 'double precision';
  if (t === 'boolean') return 'boolean';
  if (t.startsWith('numeric')) return 'numeric';
  // strip anything after first space or paren for safety
  return t.split(/[\s(]/)[0];
}

function normalizeDefault(def) {
  if (def === null || def === undefined) return null;
  let s = String(def).trim();
  if (!s) return null;
  // strip type casts like ::character varying
  s = s.replace(/::[\w\s]+$/i, '');
  // common PG serial default: nextval('...') => nextval(...)
  s = s.replace(/nextval\((.+)\)/i, (m, g1) => `nextval(${g1})`);
  // normalize CURRENT_TIMESTAMP / now() / timezone variants
  if (/^(now\(\))$/i.test(s) || /^current_timestamp$/i.test(s) || /timezone\(/i.test(s)) return 'now()';
  // strip surrounding single quotes if they are literal strings
  if (/^'.*'$/.test(s)) s = s.slice(1, -1);
  return s;
}

export function normalizeSpecFromSchema(colName, colObj) {
  // colObj is the schema JSON you authored (col.type, col.length, col.default, notNull, isIdentity, references, ...)
  const type = normalizeType(colObj.type || colObj.sqlType || '');
  const length = colObj.length ?? null;
  const precision = colObj.precision ?? null;
  const scale = colObj.scale ?? null;
  const nullable = (colObj.notNull === true) ? false : (colObj.null === false ? false : true);
  const def = normalizeDefault(colObj.default ?? null);
  const is_identity = !!colObj.isIdentity || !!colObj.serial || !!colObj.generated;
  const references = colObj.references ?? null;
  const on_delete = colObj.onDelete ?? null;

  return {
    name: colName,
    type,
    length: length === undefined ? null : length,
    precision: precision === undefined ? null : precision,
    scale: scale === undefined ? null : scale,
    nullable: !!nullable,
    default: def,
    is_identity: !!is_identity,
    references,
    on_delete
  };
}

export function normalizeSpecFromDb(row) {
  // Accept various shapes: information_schema.columns row or custom query row.
  // Defensive extraction with fallbacks.
  const column_name = row.column_name ?? row.name ?? row.column;
  const data_type = row.data_type ?? row.type ?? row.udt_name ?? '';
  const char_max_length = row.character_maximum_length ?? row.char_max_length ?? null;
  const numeric_precision = row.numeric_precision ?? null;
  const numeric_scale = row.numeric_scale ?? null;
  // is_nullable may be 'YES'/'NO' or boolean
  const is_nullable_raw = row.is_nullable ?? row.nullable ?? null;
  const is_nullable = (typeof is_nullable_raw === 'string') ? (is_nullable_raw.toUpperCase() === 'YES') : !!is_nullable_raw;
  const col_default = row.column_default ?? row.default ?? null;
  const is_identity_raw = row.is_identity ?? null;
  // some PG versions set is_identity = 'YES'/'NO', others absent but column_default includes nextval(...)
  const is_identity = (typeof is_identity_raw === 'string') ? (is_identity_raw.toUpperCase() === 'YES')
    : (col_default ? /nextval\(/i.test(String(col_default)) : false);

  const foreign_table = row.foreign_table ?? row.foreign_table_name ?? null;
  const foreign_column = row.foreign_column ?? row.foreign_column_name ?? null;
  const on_delete = row.on_delete ?? null;

  return {
    name: column_name,
    type: normalizeType(data_type),
    length: char_max_length != null ? Number(char_max_length) : null,
    precision: numeric_precision != null ? Number(numeric_precision) : null,
    scale: numeric_scale != null ? Number(numeric_scale) : null,
    nullable: !!is_nullable,
    default: normalizeDefault(col_default),
    is_identity: !!is_identity,
    references: (foreign_table && foreign_column) ? { table: foreign_table, column: foreign_column } : null,
    on_delete: on_delete ?? null
  };
}

export function compareColumnSpec(a, b) {
  // Both a and b should be normalized shapes produced above.
  if (!a || !b) return false;

  // compare type
  if ((a.type || '') !== (b.type || '')) return false;

  // compare length/precision/scale carefully (numbers or null)
  if ((a.length || null) !== (b.length || null)) return false;
  if ((a.precision || null) !== (b.precision || null)) return false;
  if ((a.scale || null) !== (b.scale || null)) return false;

  // nullable: normalized booleans
  if (!!a.nullable !== !!b.nullable) return false;

  // default - string equality (both normalized)
  if ((a.default || null) !== (b.default || null)) return false;

  // identity/serial
  if (!!a.is_identity !== !!b.is_identity) return false;

  // references: compare presence and target
  const aref = a.references ? `${a.references.table || ''}.${a.references.column || ''}` : null;
  const bref = b.references ? `${b.references.table || ''}.${b.references.column || ''}` : null;
  if (aref !== bref) return false;

  // on_delete
  if ((a.on_delete || null) !== (b.on_delete || null)) return false;

  return true;
}
