export function postRecordFormatter(record: object) {
    const text = record.text;
    let textArray = [];

    if (!record.entities?.length) {
        return [{
            type: 'text',
            content: record.text
        }];
    }

    let cursor = 0;
    for (const entity of record.entities) {
        const typed = text.slice(entity.index.start, entity.index.end);
        let plain = text.slice(cursor, entity.index.end);
        plain = plain.replace(typed, '');

        const plainObj = {
            type: 'text',
            content: plain,
        }
        const typedObj = {
            type: entity.type,
            content: typed,
            url: entity.value,
        };

        textArray.push(plainObj, typedObj)

        cursor = entity.index.end;
    }

    if (cursor < text.length) {
        textArray.push({
            type: 'text',
            content: text.slice(cursor),
        })
    }

    return textArray;
}
