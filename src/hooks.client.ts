import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';

Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,
    // integrations: [Sentry.replayIntegration()],
});

const myErrorHandler = ({ error, event }) => {
    console.error('An error occurred on the client side:', error, event);
};

export const handleError = handleErrorWithSentry(myErrorHandler);