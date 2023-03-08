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
        if (entity.type === 'link') {
            const count = entity.index.end - entity.index.start;
            const target = text.slice(cursor, entity.index.end);
            const plain = target.slice(cursor, entity.index.start - 1);
            const typed = target.slice(entity.index.start, entity.index.end);

            const plainObj = {
                type: 'text',
                content: plain,
            };
            const typedObj = {
                type: entity.type,
                content: typed,
                url: entity.value,
            };

            if (cursor === 0 && cursor === entity.index.start) {
                textArray.push(typedObj)
            } else {
                textArray.push(plainObj, typedObj)
            }

            cursor = entity.index.end + 1;
        }
    }
    if (cursor < text.length) {
        textArray.push({
            type: 'text',
            content: text.slice(cursor)
        });
    }

    return textArray;
}