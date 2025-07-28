export async function unsub() {
    if (!('Notification' in window)) {
        return true;
    }

    try {
        const swRegistration = await navigator.serviceWorker.ready;
        let subscription: PushSubscriptionJSON = await swRegistration.pushManager.getSubscription();

        if (subscription) {
            const res = await fetch(`/api/delete-subscription`, {
                method: 'post',
                body: JSON.stringify({
                    subscription: subscription,
                })
            });

            await subscription.unsubscribe();
        }
    } catch (e) {
        console.log(e);
        throw new Error(e);
    }
}

export async function sub(did: string, locale: string, notifications: string[]) {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== 'denied') {
            const swRegistration = await navigator.serviceWorker.ready;
            let subscription: PushSubscriptionJSON = await swRegistration.pushManager.getSubscription();

            if (!subscription) {
                const applicationServerKey = import.meta.env.VITE_NOTIFICATION_SERVER_KEY;
                subscription = (await swRegistration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })).toJSON();
            }

            const res = await fetch(`/api/send-subscription`, {
                method: 'post',
                body: JSON.stringify({
                    subscription: subscription,
                    did: did,
                    language: locale,
                    notifications: notifications,
                })
            });
        } else  {
            throw new Error('Notification permission nothing.');
        }
    } catch (e) {
        console.log(e);
        throw new Error(e);
    }
}

export async function isSubscribe() {
    await Notification.requestPermission();

    const swRegistration = await navigator.serviceWorker.ready;
    let subscription: PushSubscriptionJSON = await swRegistration.pushManager.getSubscription();

    return !!subscription;
}

export async function refreshPushListActivity(dids: string[], locale: string) {
    const isPushEnabled = await isSubscribe();
    if (!isPushEnabled) {
        return false;
    }

    const enableAccounts = localStorage.getItem('pushNotificationAccounts') ? JSON.parse(localStorage.getItem('pushNotificationAccounts')) : [];

    try {
        await sub(enableAccounts, locale, dids);
    } catch (e) {
        console.error(e);
        throw new Error(e);
    }
}