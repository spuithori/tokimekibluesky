import {accountsDb} from "$lib/db";
import {agent, agents} from "$lib/stores";
import {goto} from '$app/navigation';
import {ProxyAgent} from "$lib/proxyAgent";
import { PersistedState } from "runed";
import { get } from 'svelte/store';
import { unwrapFunctionStore, format } from 'svelte-i18n';

class AppState {
    ready: boolean = $state(false);
    status: number = $state(0);
    profile: PersistedState<number> = new PersistedState('currentProfile', 1);
    missingAccounts: string[] = $state([]);
    labelDefs = new PersistedState('labelDefs', []);
    subscribedLabelers = new PersistedState('subscribedLabelers', ['did:plc:ar7c4by46qjdydhdevvrndac']);
    singleColumnScrollPositions: Map<number, number> = new Map();

    async init() {
        const profiles = await accountsDb.profiles.toArray();
        const anyAccounts = await accountsDb.accounts
            .toArray();

        if (!anyAccounts.length) {
            console.log('Accounts are nothing');
            await goto('/login');
            return false;
        }

        if (this.ready) {
            return false;
        }

        if (!profiles.length) {
            console.log('Profiles are empty. create new profile.');
            const acs = anyAccounts.map(account => account.id);
            const _format = unwrapFunctionStore(format);
            const id = await accountsDb.profiles.put({
                accounts: acs as number[],
                columns: [],
                createdAt: '',
                name: _format('workspace') + ' 1',
                primary: acs[0] as number,
            })
            this.profile.current = id;

            await this.init();
            return false;
        }

        const currentProfile = this.profile.current;

        if (!currentProfile) {
            console.log('Current profile is missing.');
            this.status = 4;
            return false;
        }

        const profile = profiles.find(profile => profile.id === currentProfile);
        const accounts = await accountsDb.accounts
            .where('id')
            .anyOf(profile.accounts)
            .toArray();
        const isPrimaryAvailable = accounts.find(account => account.id === profile.primary);

        if (!profile.accounts.length) {
            console.log('There is no account in this profile.');
            this.status = 1;
            return false;
        }

        if (!accounts.length) {
            console.log('Attached accounts are missing in this profile.');
            this.status = 2;
            return false;
        }

        if (!profile.primary || !isPrimaryAvailable) {
            console.log('Primary account is missing.');
            this.status = 5;
            return false;
        }

        // Create ProxyAgent instances (no session needed - server manages sessions)
        let agentsMap = new Map<number, ProxyAgent>();
        for (const account of accounts) {
            agentsMap.set(account.id!, new ProxyAgent(account.did, account.handle));
        }

        agents.set(agentsMap);
        const _agents = get(agents);
        agent.set(_agents.get(profile.primary));

        // Fetch handles for accounts that don't have one
        for (const account of accounts) {
            const ag = agentsMap.get(account.id!);
            if (ag && !account.handle) {
                ag.getProfile({ actor: account.did }).then(res => {
                    ag.setHandle(res.data.handle);
                }).catch(() => {});
            }
        }

        this.ready = true;
    }

    changeProfile(id) {
        this.profile.current = id;
        appState.ready = false;
        appState.init();
    }
}

export const appState = new AppState();
