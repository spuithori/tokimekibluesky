import {accountsDb} from "$lib/db";

export async function getDbFollows(_agent) {
    const account = await accountsDb.accounts
        .where('did')
        .equals(_agent.did() as string)
        .first();

    if (account.following) {
        return account.following.data;
    } else {
        return await getFollowsWithUpdateDb(_agent, account.id as string);
    }
}

export async function getFollowsWithUpdateDb(_agent, accountId) {
    let cursor = '';
    let count = 0;
    let follows = [];

    try {
        follows = [...follows, _agent.did()];

        while(cursor !== undefined && count < 30) {
            const res = await _agent.agent.api.app.bsky.graph.getFollows({actor: _agent.did(), limit: 100, cursor: cursor});

            res.data.follows.forEach(follow => {
                follows = [...follows, follow.did];
            })

            count = count + 1;
            cursor = res.data.cursor;
        }

        try {
            const id = await accountsDb.accounts.update(accountId, {
                following: {
                    data: follows,
                    indexedAt: Date.now().toString()
                }
            });
        } catch (e) {
            console.error(e);
        }
    } catch(e) {
        throw new Error(e);
    }

    return follows;
}