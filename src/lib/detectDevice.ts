export const isMobile = {
    Android: function() {
        return !!navigator.userAgent.match(/Android/i);
    },
    iOS: function() {
        return !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.iOS());
    }
};
