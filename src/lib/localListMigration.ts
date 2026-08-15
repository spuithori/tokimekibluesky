export type LocalList = {
    id: string,
    name: string,
    members: string[],
    owner: string,
    cloudMigrated?: boolean,
};

export function sanitizeMembers(members: unknown): string[] {
    if (!Array.isArray(members)) {
        return [];
    }
    return [...new Set(members.filter((m): m is string => typeof m === 'string' && m.startsWith('did:')))];
}

export function unmigratedLocalLists(lists: LocalList[] | null | undefined, ownerDid: string | undefined): LocalList[] {
    if (!ownerDid) {
        return [];
    }
    return (lists || []).filter(list => list?.owner === ownerDid && !list?.cloudMigrated);
}

export async function migrateLocalList(agent: any, list: LocalList): Promise<void> {
    await agent.addCloudList({
        name: (list.name && list.name.trim()) || 'List',
        members: sanitizeMembers(list.members),
    });
    list.cloudMigrated = true;
}

export async function migrateLocalLists(agent: any, lists: LocalList[]): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;

    for (const list of lists) {
        try {
            await migrateLocalList(agent, list);
            success++;
        } catch (e) {
            console.error(e);
            failed++;
        }
    }

    return { success, failed };
}
