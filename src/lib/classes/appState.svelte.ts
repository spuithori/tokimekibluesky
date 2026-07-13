import {accountsDb, type Account} from "$lib/db";
import type {Agent} from "$lib/agent";
import {agent, agents} from "$lib/stores";
import {startAccountsResume, type ResumeOutcome, type ResumePhase} from "$lib/resumeAccountsSession";
import {goto} from '$app/navigation';
import { PersistedState } from "runed";
import { t } from 'tokimeki-i18n';

export interface AccountResumeStatus {
    phase: ResumePhase;
    attempt: number;
    handle: string;
    accountId: number;
}

class AppState {
    ready: boolean = $state(false);
    shellReady: boolean = $state(false);
    status: number = $state(0);
    pdsRequestReady: boolean = $state(false);
    profile: PersistedState<number> = new PersistedState('currentProfile', 1);
    missingAccounts: Account[] = $state([]);
    resumeStatus: Record<string, AccountResumeStatus> = $state({});
    resumePrimaryDid: string = $state('');
    labelDefs = new PersistedState('labelDefs', []);
    subscribedLabelers = new PersistedState('subscribedLabelers', ['did:plc:ar7c4by46qjdydhdevvrndac']);
    singleColumnScrollPositions: Map<number, number> = new Map();

    private hasBooted = false;
    private initEpoch = 0;
    private resumeGeneration = new Map<number, number>();
    private resumeAccounts: Account[] = [];
    private resumeProxy: string | undefined = undefined;
    private resumePrimaryId = 0;
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

        if (!profile) {
            console.log('Current profile is not found.');
            this.status = 4;
            return false;
        }

        const accounts = await accountsDb.accounts
            .where('id')
            .anyOf(profile.accounts)
            .toArray();

        if (epoch !== this.initEpoch) {
            return false;
        }

        const primaryAccount = accounts.find(account => account.id === profile.primary);

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

        if (!profile.primary || !primaryAccount) {
            console.log('Primary account is missing.');
            this.status = 5;
            return false;
        }

        if (!this.hasBooted) {
            this.shellReady = true;
        }

        this.resumeAccounts = accounts;
        this.resumeProxy = profile?.appViewProxy;
        this.resumePrimaryId = profile.primary;
        this.resumePrimaryDid = primaryAccount.did;
        this.resumeStatus = {};
        this.missingAccounts = [];
        if (this.status === 3) {
            this.status = 0;
        }
        agents.set(new Map());

        let primaryPromise: Promise<ResumeOutcome | null> = Promise.resolve(null);

        for (const account of accounts) {
            const promise = this.launchResume(account, epoch);
            if (account.id === profile.primary) {
                primaryPromise = promise;
            }
        }

        const primaryOutcome = await primaryPromise;

        if (epoch !== this.initEpoch) {
            return false;
        }

        if (!primaryOutcome || primaryOutcome.status !== 'resumed') {
            console.log('Primary agent session restore failed:', primaryOutcome?.status);
            return false;
        }

        this.completeBoot(primaryOutcome.agent);
    }

    private launchResume(account: Account, epoch: number): Promise<ResumeOutcome | null> {
        const accountId = account.id!;
        const generation = (this.resumeGeneration.get(accountId) ?? 0) + 1;
        this.resumeGeneration.set(accountId, generation);

        const isCurrent = () => epoch === this.initEpoch && this.resumeGeneration.get(accountId) === generation;

        const { perAccount } = startAccountsResume([account], this.resumeProxy, {
            onStatus: (acc, phase, meta) => {
                if (!isCurrent()) return;
                this.handleResumeStatus(acc, phase, meta);
            },
        });

        return perAccount.get(accountId)!.then(outcome => {
            if (!isCurrent()) return null;
            this.handleAccountResolved(account, outcome);
            return outcome;
        });
    }

    private handleResumeStatus(account: Account, phase: ResumePhase, meta?: { attempt?: number; error?: unknown }) {
        this.resumeStatus[account.did] = {
            phase,
            attempt: meta?.attempt ?? 0,
            handle: account.handle || (account.session as any)?.handle || account.did,
            accountId: account.id!,
        };

        if (phase === 'auth-required') {
            this.reportAuthRequired(account);
        }

        if (phase === 'resumed') {
            setTimeout(() => {
                this.setPdsRequestReady();
            }, 1000);
        }
    }

    private handleAccountResolved(account: Account, outcome: ResumeOutcome) {
        if (outcome.status !== 'resumed') {
            return;
        }

        try {
            outcome.agent.configureLabelers(this.subscribedLabelers.current);
        } catch (e) {
            console.error(e);
        }

        agents.update(map => new Map(map).set(account.id!, outcome.agent));
    }

    private completeBoot(primaryAgent: Agent) {
        agent.set(primaryAgent);
        this.hasBooted = true;
        this.shellReady = true;
        this.ready = true;

        if (!Object.keys(this.labelDefs.current).length) {
            primaryAgent.getLabelDefinitions(this.subscribedLabelers.current)
                .then(defs => { this.labelDefs.current = defs; })
                .catch(e => { console.error(e); });
        }
    }

    reportAuthRequired(account: Account) {
        if (this.missingAccounts.some(a => a.id === account.id)) return;
        this.missingAccounts = [...this.missingAccounts, account];
    }

    getResumeAccountById(accountId: number | undefined): Account | undefined {
        if (!accountId) return undefined;
        return this.resumeAccounts.find(a => a.id === accountId);
    }

    getResumePhase(did: string | undefined): ResumePhase | undefined {
        if (!did) return undefined;
        return this.resumeStatus[did]?.phase;
    }

    isColumnResumePending(agentsMap: Map<number, Agent>, did: string | undefined): boolean {
        if (!did) return false;
        for (const _agent of agentsMap.values()) {
            if (_agent.did() === did) return false;
        }
        const phase = this.resumeStatus[did]?.phase;
        return phase === 'pending' || phase === 'retrying';
    }

    async retryAccount(accountId: number) {
        const epoch = this.initEpoch;
        const cached = this.resumeAccounts.find(a => a.id === accountId);
        if (!cached) return;

        const latest = await accountsDb.accounts.get(accountId);

        if (epoch !== this.initEpoch) return;

        const outcome = await this.launchResume(latest ?? cached, epoch);
        if (!outcome) return;

        if (outcome.status === 'resumed' && accountId === this.resumePrimaryId && !this.ready) {
            this.completeBoot(outcome.agent);
        }
    }

    retryUnreachableAccounts() {
        for (const status of Object.values(this.resumeStatus)) {
            if (status.phase === 'unreachable') {
                this.retryAccount(status.accountId);
            }
        }
    }

    retryStalledResume() {
        this.retryUnreachableAccounts();

        if (!this.ready && this.resumePrimaryId) {
            const primary = Object.values(this.resumeStatus).find(s => s.accountId === this.resumePrimaryId);
            if (primary && (primary.phase === 'pending' || primary.phase === 'retrying')) {
                this.retryAccount(this.resumePrimaryId);
            }
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
