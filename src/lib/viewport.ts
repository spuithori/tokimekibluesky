import {onDestroy} from "svelte";
import {browser} from "$app/environment";

export default function viewPortSetting() {
    if (!browser) return;

    const viewport = document.querySelector('meta[name="viewport"]');
    function switchViewport() {
        const value = window.outerWidth > 374 ? 'width=device-width, minimum-scale=1, maximum-scale=1, viewport-fit=cover' : 'width=374, viewport-fit=cover';
        if (viewport.getAttribute('content') !== value) {
            viewport.setAttribute('content', value);
        }
    }
    addEventListener('resize', switchViewport, false);
    switchViewport();

    onDestroy(() => {
        removeEventListener('resize', switchViewport, false);
    })
}
