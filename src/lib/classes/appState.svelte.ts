import {accountsDb} from "$lib/db";
import {agent, agents} from "$lib/stores";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";
import {goto} from '$app/navigation';
import { PersistedState } from "runed";
import { get } from 'svelte/store';
import { t } from 'tokimeki-i18n';

class AppState {
    ready: boolean = $state(false);
    shellReady: boolean = $state(false);
    status: number = $state(0);
    pdsRequestReady: boolean = $state(false);
    profile: PersistedState<number> = new PersistedState('currentProfile', 1);
    missingAccounts: string[] = $state([]);
    labelDefs = new PersistedState('labelDefs', []);
    subscribedLabelers = new PersistedState('subscribedLabelers', ['did:plc:ar7c4by46qjdydhdevvrndac']);
    singleColumnScrollPositions: Map<number, number> = new Map();

    private hasBooted = false;
    private initEpoch = 0;
    private _dbPreload: Promise<{ profiles: any[]; accounts: any[] }> | null = null;

    preloadDb() {
        if (!this._dbPreload) {
            this._dbPreload = Promise.all([
                accountsDb.profiles.toArray(),
                accountsDb.accounts.toArray(),
            ]).then(([profiles, accounts]) => ({ profiles, accounts }));
        }
        return this._dbPreload;
    }

    async init() {
        const epoch = ++this.initEpoch;

        const { profiles, accounts: anyAccounts } = await this.preloadDb();
        this._dbPreload = null;

        if (epoch !== this.initEpoch) {
            return false;
        }

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
            const id = await accountsDb.profiles.put({
                accounts: acs as number[],
                columns: [],
                createdAt: '',
                name: t('workspace') + ' 1',
                primary: acs[0] as number,
            })

            if (epoch !== this.initEpoch) {
                return false;
            }

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

        if (epoch !== this.initEpoch) {
            return false;
        }

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

        if (!this.hasBooted) {
            this.shellReady = true;
        }

        let agentsMap = await resumeAccountsSession(accounts, profile?.appViewProxy);

        if (epoch !== this.initEpoch) {
            return false;
        }

        agents.set(agentsMap);
        const _agents = get(agents);
        agent.set(_agents.get(profile.primary));
        const _agent = get(agent);

        if (!_agent) {
            console.log('Primary agent session restore failed.');
            const primaryAccount = accounts.find(a => a.id === profile.primary);
            if (primaryAccount && !this.missingAccounts.some((a: any) => a.id === primaryAccount.id)) {
                this.missingAccounts = [...this.missingAccounts, primaryAccount];
            }
            return false;
        }

        try {
            _agents.forEach((ag) => {
                ag.configureLabelers(this.subscribedLabelers.current);
            });
        } catch (e) {
            console.error(e);
        }

        this.hasBooted = true;
        this.shellReady = true;
        this.ready = true;

        if (!Object.keys(this.labelDefs.current).length) {
            _agent.getLabelDefinitions(this.subscribedLabelers.current)
                .then(defs => { this.labelDefs.current = defs; })
                .catch(e => { console.error(e); });
        }
    }

    changeProfile(id) {
        this.profile.current = id;
        appState.ready = false;
        appState.shellReady = false;
        appState.init();
    }

    setPdsRequestReady() {
        this.pdsRequestReady = true;
    }
}

export const appState = new AppState();