class FeedHintState {
    view = $state<any | undefined>();

    hasFeed(rkey: string, handleOrDid: string) {
        if (!this.view?.uri) {
            return false;
        }

        if (this.view.uri.split('/').slice(-1)[0] !== rkey) {
            return false;
        }

        if (handleOrDid.startsWith('did:')) {
            return this.view.creator?.did === handleOrDid;
        }

        return !this.view.creator?.handle || this.view.creator.handle === handleOrDid;
    }

    set(view: any) {
        this.view = view;
    }

    clear() {
        this.view = undefined;
    }
}

export const feedHintState = new FeedHintState();
