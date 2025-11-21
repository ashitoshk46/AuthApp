export const tableAttributes = Object.freeze({
    PRIMARY_COMPOSITE: 'PRIMARY_COMPOSITE',
    UNIQUE: 'UNIQUE',
});

export const tableAttributesMappings = Object.freeze({
    [tableAttributes.PRIMARY_COMPOSITE]: 'primary',
    [tableAttributes.UNIQUE]: 'unique',
});

