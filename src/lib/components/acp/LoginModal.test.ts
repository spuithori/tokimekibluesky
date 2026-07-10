import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginModal from './LoginModal.svelte';
import { accountsDb } from '$lib/db';
import { toast } from 'svelte-sonner';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock('$lib/oauth', () => ({ signIn: vi.fn(async () => {}) }));
vi.mock('$lib/db', () => ({
    accountsDb: {
        accounts: {
            get: vi.fn(),
            update: vi.fn(async () => 1),
            put: vi.fn(async () => 1),
        },
    },
}));
vi.mock('$lib/password-session', () => ({
    PasswordSession: class {
        login = loginMock;
    },
}));
vi.mock('svelte-sonner', () => ({
    toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('LoginModal tabs', () => {
    it('opens the OAuth tab by default', () => {
        const { container } = render(LoginModal);
        expect(screen.getByRole('combobox')).toBeTruthy();
        expect(container.querySelector('#password')).toBeNull();
    });

    it('respects initialAuthMode=password and keeps tabs switchable', async () => {
        const { container } = render(LoginModal, { props: { initialAuthMode: 'password' } });
        expect(container.querySelector('#password')).toBeTruthy();

        const oauthTab = screen.getByRole('button', { name: 'OAuth (recommended)' }) as HTMLButtonElement;
        expect(oauthTab.disabled).toBe(false);

        await fireEvent.click(oauthTab);
        expect(container.querySelector('#password')).toBeNull();
        expect(screen.getByRole('combobox')).toBeTruthy();
    });

    it('locks tabs only when lockAuthMode is set', () => {
        render(LoginModal, { props: { initialAuthMode: 'password', lockAuthMode: true } });
        const oauthTab = screen.getByRole('button', { name: 'OAuth (recommended)' }) as HTMLButtonElement;
        expect(oauthTab.disabled).toBe(true);
    });
});

describe('LoginModal identifier lock', () => {
    it('locks a prefilled identifier for missing accounts', () => {
        render(LoginModal, { props: { isMissing: true, identifier: 'alice.bsky.social', initialAuthMode: 'oauth' } });
        expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true);
    });

    it('keeps an empty identifier editable for missing accounts', () => {
        render(LoginModal, { props: { isMissing: true, identifier: '', initialAuthMode: 'oauth' } });
        expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(false);
    });

    it('keeps the password identifier readonly only when prefilled', () => {
        const { container } = render(LoginModal, { props: { isMissing: true, identifier: '', initialAuthMode: 'password' } });
        const email = container.querySelector('#email') as HTMLInputElement;
        expect(email.readOnly).toBe(false);
    });
});

describe('LoginModal account mismatch guard', () => {
    async function submitPasswordLogin(container: HTMLElement) {
        await fireEvent.input(container.querySelector('#email')!, { target: { value: 'someone.example' } });
        await fireEvent.input(container.querySelector('#password')!, { target: { value: 'pw' } });
        await fireEvent.submit(container.querySelector('form')!);
    }

    it('rejects re-login with a different account', async () => {
        vi.mocked(accountsDb.accounts.get).mockResolvedValue({ id: 1, did: 'did:plc:original' } as any);
        loginMock.mockResolvedValue({ did: 'did:plc:someoneelse', handle: 'someone.example' });

        const { container } = render(LoginModal, { props: { existingId: 1, initialAuthMode: 'password' } });
        await submitPasswordLogin(container);

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(accountsDb.accounts.update).not.toHaveBeenCalled();
    });

    it('updates the account when the DID matches', async () => {
        vi.mocked(accountsDb.accounts.get).mockResolvedValue({ id: 1, did: 'did:plc:original' } as any);
        loginMock.mockResolvedValue({ did: 'did:plc:original', handle: 'someone.example' });

        const { container } = render(LoginModal, { props: { existingId: 1, initialAuthMode: 'password' } });
        await submitPasswordLogin(container);

        await waitFor(() => expect(accountsDb.accounts.update).toHaveBeenCalled());
        expect(toast.error).not.toHaveBeenCalled();
    });
});
