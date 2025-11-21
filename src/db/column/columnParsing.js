import  { dbTypes, typeMappings } from './dbTypes.js';


/**
 * Build PostgreSQL column type string dynamically.
 * @param {string} dbType - One of dbTypes keys.
 * @param {object} options - Additional parameters:
 *   length: number (for character varying)
 *   precision: number (for numeric)
 *   scale: number (for numeric)
 *   refTable: string (for foreign key)
 *   refColumn: string (for foreign key)
 *   primary: boolean
 *   unique: boolean
 *   notNull: boolean
 *   default: any (default value)
 */
export function buildColumnType(dbType, options = {}) {
    let baseType = typeMappings[dbType];
    if (!baseType) throw new Error(`Unsupported dbType: ${dbType}`);

    let typeString = baseType;

    // ID column special handling
    if (dbType === dbTypes.ID) {
        typeString = 'integer generated always as identity';
        // if (options.primary !== false) typeString += ' primary key';
    }

    // Handle length for character varying
    if (dbType === dbTypes.STRING && options.length) {
        typeString += `(${options.length})`;
    }

    // Handle precision & scale for numeric
    if (dbType === dbTypes.DECIMAL && (options.precision || options.scale)) {
        const precision = options.precision || 10;
        const scale = options.scale || 2;
        typeString += `(${precision}, ${scale})`;
    }

    // Handle REFERENCES
    if (dbType === dbTypes.REFERENCE) {
        if (options.refTable && options.refColumn) {
            typeString = `integer references ${options.refTable}(${options.refColumn})${options.onDelete ? ` on delete ${options.onDelete}` : ""}`;
        } else {
            throw new Error('REFERENCE type requires refTable and refColumn options.');
        }
    }

    // Add constraints
    // if (options.primary && dbType !== dbTypes.ID) typeString += ' primary key';
    if (options.unique) typeString += ' unique';
    if (options.notNull) typeString += ' not null';

    // Add default value or expression
    if (options.default !== undefined) {
        // If default looks like a function call, don't quote it
        const isExpression = typeof options.default === 'string' && /\(\)$/.test(options.default);
        const defaultVal = isExpression ? options.default : (typeof options.default === 'string' ? `'${options.default}'` : options.default);
        typeString += ` default ${defaultVal}`;
    } else {
        if (dbType === dbTypes.TIMESTAMP && options.current) {
            typeString += ' default CURRENT_TIMESTAMP';
        }
        // UUID: no automatic default unless explicitly provided
    }

    // Add CHECK constraint
    // if (options.check) {
    //     typeString += ` check (${options.check})`;
    // }

    // console.log("options : ", options);
    return `${options.name} ${typeString}`;
}