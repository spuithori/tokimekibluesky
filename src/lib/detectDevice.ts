export const isMobile = {
    Android: function() {
        if (typeof navigator === 'undefined') return false;
        return !!navigator.userAgent.match(/Android/i);
    },
    iOS: function() {
        if (typeof navigator === 'undefined') return false;
        return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.iOS());
    }
};
