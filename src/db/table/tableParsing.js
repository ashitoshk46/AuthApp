import { tableAttributes } from './dbTable.js';

export const buildTable = (tableSchema) => {
    if (!tableSchema || typeof tableSchema !== 'object' || !tableSchema.columns || typeof tableSchema.columns !== 'object') {
        throw new Error('Invalid table schema provided.');
    }

    let primaryCols = []
    tableSchema.columns.forEach((col) => {
        if (col?.primary) {
            primaryCols.push(col.name);
        }
    })
    if (primaryCols.length > 1) {
        throw new Error(`Table schema has multiple primary key columns defined: ${primaryCols.join(', ')}. Use composite primary key constraint instead.`);
    }

    if (primaryCols.length === 1 && tableSchema.primaryComposite && tableSchema.primaryComposite.length > 0) {
        throw new Error(`Table schema has both single primary key column (${primaryCols[0]}) and composite primary key constraint defined.`);
    }

    let constraints = [];

    if (tableSchema.primaryComposite) {
        constraints.push({
            type: tableAttributes.PRIMARY_COMPOSITE,
            columns: tableSchema.primaryComposite,
        });
    } else if (primaryCols.length === 1) {
        constraints.push({
            type: tableAttributes.PRIMARY_COMPOSITE,
            columns: primaryCols,
        });
    }

    if (tableSchema.uniqueConstraints) {
        constraints.push({
            type: tableAttributes.UNIQUE,
            columns: tableSchema.uniqueConstraints,
        });
    }

    return buildTableConstraints(constraints);
}

function buildTableConstraints(constraints = []) {
    return constraints.map(c => {
        switch (c.type) {
            case tableAttributes.PRIMARY_COMPOSITE:
                return `primary key (${c.columns.join(', ')})`;
            case tableAttributes.UNIQUE:
                return `unique (${c.columns.join(', ')})`;
            default:
                throw new Error(`Unsupported table constraint type: ${c.type}`);
        }
    }).join(', ');
}