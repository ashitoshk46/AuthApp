// tests/normalizeSpec.test.js
import { normalizeSpecFromDb, normalizeSpecFromSchema, compareColumnSpec } from '../server/db/normalizeColumnSpec.js';

test('normalize and compare basic varchar column', () => {
  const schemaCol = { name: 'title', type: 'varchar', length: 255, default: null };
  const dbRow = {
    column_name: 'title',
    data_type: 'character varying',
    character_maximum_length: 255,
    numeric_precision: null,
    numeric_scale: null,
    is_nullable: 'YES',
    column_default: null,
    is_identity: 'NO'
  };

  const sSpec = normalizeSpecFromSchema('title', schemaCol);
  const dSpec = normalizeSpecFromDb(dbRow);

  expect(compareColumnSpec(sSpec, dSpec)).toBe(true);
});
