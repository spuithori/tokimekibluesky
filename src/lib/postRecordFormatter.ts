export function postRecordFormatter(record: object) {
    const text = record.text;
    const textBytesArray = new TextEncoder().encode(text);
    let facets = record.facets;
    let textArray = [];

    if (!record.facets?.length) {
        return [{
            type: 'text',
            content: record.text
        }];
    }

    facets.sort((a, b) => a.index.byteStart - b.index.byteEnd);

    let cursor = 0;
    for (const facet of facets) {
        const typed = textBytesArray.slice(facet.index.byteStart, facet.index.byteEnd);
        let plain = textBytesArray.slice(cursor, facet.index.byteStart);

        const plainObj = {
            type: 'text',
            content: new TextDecoder().decode(plain),
        }
        const typedObj = {
            type: facet.features[0].$type,
            content: new TextDecoder().decode(typed),
            url: facet.features[0].uri || facet.features[0].did,
        };

        textArray.push(plainObj, typedObj)

        cursor = facet.index.byteEnd;
    }

    if (cursor < textBytesArray.length) {
        textArray.push({
            type: 'text',
            content:  new TextDecoder().decode(textBytesArray.slice(cursor)),
        })
    }

    return textArray;
}
