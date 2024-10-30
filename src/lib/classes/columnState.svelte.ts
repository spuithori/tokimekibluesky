import type {Column} from "$lib/types/column";
import {getContext, setContext} from "svelte";
import {accountsDb} from "$lib/db";

export class ColumnState {
    columns = $state<Column[]>([]);
    syncColumns = $derived(this.columns.map(({ scrollElement, data, ...rest }) => ({
        ...rest,
        data: {
            feed: [],
            cursor: ''
        }
    })));

    constructor(isJunk: boolean = false) {
        if (isJunk) {
            $effect(() => {
                if (this.columns.length > 20) {
                    this.columns.shift();
                }
            })

            return;
        }

        const storageColumns = localStorage.getItem('columns') || JSON.stringify([]);
        this.columns = JSON.parse(storageColumns);

        $effect(() => {
            const profileId = localStorage.getItem('currentProfile');
            if (!profileId) {
                return;
            }

            const id = accountsDb.profiles.update(Number(profileId), {
                columns: $state.snapshot(this.syncColumns),
            })
        })

        $effect(() => {
            localStorage.setItem('columns', JSON.stringify(this.syncColumns));
        })
    }

    add(column: Column) {
        this.columns.push(column)
    }

    remove(id: string) {
        this.columns = this.columns.filter(column => column.id !== id);
    }

    getColumn(index: number) {
        return this.columns[index];
    }

    hasColumn(id: string) {
        return this.columns.some(column => column.id === id);
    }

    getColumnIndex(id: string) {
        return this.columns.findIndex(column => column.id === id);
    }
}

const ColumnUnique = Symbol();
const JunkColumnUnique = Symbol('junk');

export function initColumns() {
    setColumnState(false);
    setColumnState(true);
}

export function setColumnState(isJunk: boolean = false) {
    return setContext(isJunk ? JunkColumnUnique : ColumnUnique, new ColumnState(isJunk));
}

export function getColumnState(isJunk: boolean = false) {
    return getContext<ReturnType<typeof setColumnState>>(isJunk ? JunkColumnUnique : ColumnUnique);
}
