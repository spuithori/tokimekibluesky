import { OFFICIAL_THEME_DID, themeUri } from './format';

export const LEGACY_THEME_RKEYS: Readonly<Record<string, string>> = {
    '11ebee9d-aeee-48ad-9bd1-3cdb15fec8ef': 'monstera',
    'a5d47d95-882a-49c3-90ce-0f0533c93fb1': 'mono',
    '1f1ceeca-220b-4d3b-9886-3f80a158472c': 'classic-twilight',
    '7a14bf21-a598-46ea-94a4-f80848e20757': 'classic',
    '4e5a7a20-62c5-4b79-a506-001bb6357766': 'bubble-standard',
    'b461e2a4-3c6c-4624-9541-920b818e30f8': 'stellar-mermaid',
    'd7783b71-d2e9-4326-a645-0205820bcd67': 'dokokimi',
    'ec46d3bd-3c17-45b8-8dd6-ed29b40d2829': 'minamo',
    'b7424262-db95-4417-9862-f681851a87df': 'ola',
    'be30f84a-0159-4c7a-a615-1da3a24ccc92': 'fly-with-you',
    'd95933bd-a43f-4f71-b790-f7e8e8e413ff': 'horizon-lite',
    '961ff6cf-af65-484c-8cfb-84d6c9022da6': 'social-app',
    'ada701e0-4e71-4730-bb89-9d7fab32415a': 'solarized',
    '59ad4759-62d0-4691-abab-9fa6dfb1a5ce': 'sukoshi-aki',
    '44f4b378-13a0-406e-bb0d-e21915ac902e': 'galactic-trip',
    '4ff38923-9fea-427b-b1f9-5b9b743267a5': 'sky',
    '29c86945-da1c-410a-a9de-8ab0fa979e06': 'vivid-world',
    '98fbdf34-9ae5-4ae0-b95e-7e90219e2282': 'horizon-pro',
    '344da082-7b63-4f45-bf10-c9f8673f99cd': 'dracula',
    '3b7baf0a-ee47-42df-9431-5816ce65018e': 'grass',
};

export function legacyThemeUri(id: string | undefined | null): string | undefined {
    const rkey = id ? LEGACY_THEME_RKEYS[id] : undefined;
    return rkey ? themeUri(OFFICIAL_THEME_DID, rkey) : undefined;
}
