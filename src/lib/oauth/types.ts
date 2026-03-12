/** OAuth Authorization Server Metadata (RFC 8414) */
export interface OAuthServerMetadata {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    revocation_endpoint?: string;
    pushed_authorization_request_endpoint?: string;
    dpop_signing_alg_values_supported?: string[];
    scopes_supported?: string[];
    response_types_supported?: string[];
    grant_types_supported?: string[];
    code_challenge_methods_supported?: string[];
    token_endpoint_auth_methods_supported?: string[];
    token_endpoint_auth_signing_alg_values_supported?: string[];
    require_pushed_authorization_requests?: boolean;
}

/** Token endpoint response */
export interface TokenResponse {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    expires_in?: number;
    sub: string;
    scope?: string;
}

/** Serialized DPoP key pair for IndexedDB storage */
export interface ExportedKeyPair {
    privateKey: JsonWebKey;
    publicKey: JsonWebKey;
}

/** Session data persisted to IndexedDB */
export interface StoredSession {
    did: string;
    accessToken: string;
    refreshToken?: string;
    tokenType: string;
    scope?: string;
    expiresAt: number;
    dpopKeyJwk: ExportedKeyPair;
    serverMetadata: OAuthServerMetadata;
    pdsUrl: string;
}

/** Authorization flow state persisted to IndexedDB */
export interface StoredState {
    state: string;
    codeVerifier: string;
    dpopKeyJwk: ExportedKeyPair;
    serverMetadata: OAuthServerMetadata;
    redirectUri: string;
    pdsUrl: string;
    timestamp: number;
}

/** Client metadata for OAuth registration */
export interface ClientMetadata {
    client_id: string;
    client_name?: string;
    redirect_uris: string[];
    scope: string;
    grant_types: string[];
    response_types: string[];
    token_endpoint_auth_method: string;
    token_endpoint_auth_signing_alg?: string;
    dpop_bound_access_tokens: boolean;
    application_type?: string;
    jwks_uri?: string;
}

/** OAuth session interface exposed to the application */
export interface OAuthSession {
    did: string;
    fetchHandler(input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

/** Protected resource metadata (RFC 9728) */
export interface ProtectedResourceMetadata {
    resource: string;
    authorization_servers: string[];
}
