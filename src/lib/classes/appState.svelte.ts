import {accountsDb} from "$lib/db";
import {agent, agents} from "$lib/stores";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";
import {goto} from '$app/navigation';
import {BskyAgent} from "@atproto/api";
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

        let agentsMap = await resumeAccountsSession(accounts, profile?.appViewProxy);
        agents.set(agentsMap);
        const _agents = get(agents);
        agent.set(_agents.get(profile.primary));
        const _agent = get(agent);

        try {
            _agents.forEach((ag) => {
                ag.agent.configureLabelers(this.subscribedLabelers.current);
            });

            if (!Object.keys(this.labelDefs.current).length) {
                this.labelDefs.current = await _agent.agent.getLabelDefinitions(this.subscribedLabelers.current);
            }
        } catch (e) {
            console.error(e);
        }

        // this.status = 0;
        this.ready = true;
    }

    changeProfile(id) {
        this.profile.current = id;
        appState.ready = false;
        appState.init();
    }
}

export const appState = new AppState();