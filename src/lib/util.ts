export function getAccountIdByDid(agents, did) {
    let id;

    agents.forEach((value, key, map) => {
        if (value.did() === did) {
            id = key;
        }
    });

    return id;
}

export function getAllAgentDids(agents) {
    if (!agents) {
        return [];
    }
    let dids = [];

    agents.forEach((value, key, map) => {
        dids = [...dids, value.did()];
    });

    return dids;
}

export function isDid(name) {
    return !!name.startsWith('did:plc:');
}