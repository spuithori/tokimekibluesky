import {accountsDb, type Account} from "$lib/db";
import type {Agent} from "$lib/agent";
import {agent, agents} from "$lib/stores";
import {startAccountsResume, type ResumeOutcome, type ResumePhase} from "$lib/resumeAccountsSession";
import {goto} from '$app/navigation';
import { PersistedState } from "runed";
import { t } from 'tokimeki-i18n';
import { recordError } from '$lib/errorLog';

export interface AccountResumeStatus {
    phase: ResumePhase;
    attempt: number;
    handle: string;
    accountId: number;
    offline?: boolean;
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
    bootError: { name: string; message: string } | null = $state(null);
    labelDefs = new PersistedState('labelDefs', []);
    subscribedLabelers = new PersistedState('subscribedLabelers', ['did:plc:ar7c4by46qjdydhdevvrndac']);
    singleColumnScrollPositions: Map<number, number> = new Map();

    private hasBooted = false;
    private initEpoch = 0;
    private snoozedMissingIds = new Set<number>();
    private freshHandles = new Map<string, string>();
    private handleListeners = new Set<(did: string, handle: string) => void>();
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

        if (this.bootError) {
            this.bootError = null;
        }

        try {
            return await this.runInit(epoch);
        } catch (error) {
            console.error('Boot initialization failed:', error);
            recordError(error, 'boot');
            this._dbPreload = null;

            if (epoch === this.initEpoch) {
                this.bootError = {
                    name: error instanceof Error ? error.name : typeof error,
                    message: error instanceof Error ? error.message : String(error),
                };
            }
            return false;
        }
    }

    private async runInit(epoch: number) {
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
            onHandle: (acc, handle) => {
                if (!isCurrent()) return;
                this.handleHandleRefreshed(acc, handle);
            },
        });

        return perAccount.get(accountId)!.then(outcome => {
            if (!isCurrent()) return null;
            this.handleAccountResolved(account, outcome);
            return outcome;
        });
    }

    private handleResumeStatus(account: Account, phase: ResumePhase, meta?: { attempt?: number; error?: unknown; offline?: boolean }) {
        this.resumeStatus[account.did] = {
            phase,
            attempt: meta?.attempt ?? 0,
            handle: this.freshHandles.get(account.did) || account.handle || (account.session as any)?.handle || account.did,
            accountId: account.id!,
            offline: meta?.offline || undefined,
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

    snoozeMissingAccounts() {
        for (const account of this.missingAccounts) {
            if (account.id !== undefined) {
                this.snoozedMissingIds.add(account.id);
            }
        }
        this.status = 0;
    }

    hasUnsnoozedMissing(): boolean {
        return this.missingAccounts.some(a => a.id !== undefined && !this.snoozedMissingIds.has(a.id));
    }

    isPrimaryMissing(): boolean {
        return this.missingAccounts.some(a => a.id === this.resumePrimaryId);
    }

    getResumeAccountById(accountId: number | undefined): Account | undefined {
        if (!accountId) return undefined;
        return this.resumeAccounts.find(a => a.id === accountId);
    }

    private handleHandleRefreshed(account: Account, handle: string) {
        this.freshHandles.set(account.did, handle);

        const status = this.resumeStatus[account.did];
        if (status) {
            status.handle = handle;
        }

        for (const listener of this.handleListeners) {
            listener(account.did, handle);
        }
    }

    registerHandleListener(listener: (did: string, handle: string) => void): () => void {
        this.handleListeners.add(listener);
        return () => {
            this.handleListeners.delete(listener);
        };
    }

    getFreshHandle(did: string | undefined): string | undefined {
        if (!did) return undefined;
        return this.freshHandles.get(did);
    }

    getResumePhase(did: string | undefined): ResumePhase | undefined {
        if (!did) return undefined;
        return this.resumeStatus[did]?.phase;
    }

    getColumnResumeGate(agentsByDidMap: Map<string, Agent>, did: string | undefined): 'mount' | 'pending' | 'failed' {
        if (!did) return 'mount';
        if (agentsByDidMap.has(did)) return 'mount';
        const phase = this.resumeStatus[did]?.phase;
        if (phase === 'pending' || phase === 'retrying') return 'pending';
        if (phase === 'auth-required' || phase === 'unreachable') return 'failed';
        return 'mount';
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
