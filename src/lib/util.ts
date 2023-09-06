export function getAccountIdByDid(agents, did) {
    let id;

    agents.forEach((value, key, map) => {

        if (value.did() === did) {
            id = key;
        }
    });

    return id;
}

export function isDid(name) {
    return !!name.startsWith('did:plc:');
}