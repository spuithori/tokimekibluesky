let intervalId;
let counter = 0;
const delay = 1000;

if (intervalId) {
    clearInterval(intervalId);
}

intervalId = setInterval(() => {
    counter = counter + 1;
    self.postMessage(counter);
}, delay);
