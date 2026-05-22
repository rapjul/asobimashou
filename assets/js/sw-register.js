/* Offline support - load service worker only after page finishes loading */
window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./serviceWorker.js")
      .then((registration) => {
        console.log("Ready for offline use.");

        // If there's no controller, this is the first install.
        const isFirstInstall = !navigator.serviceWorker.controller;

        /**
         * Checks the state of the installing worker and triggers a toast notification
         * when the installation completes and content is successfully cached.
         *
         * @param {ServiceWorker} worker - The installing service worker instance.
         * @returns {void}
         */
        const trackInstalling = (worker) => {
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") {
              if (isFirstInstall) {
                if (typeof window.showCacheSuccessToast === "function") {
                  window.showCacheSuccessToast();
                }
              } else {
                if (typeof window.showCacheUpdateToast === "function") {
                  window.showCacheUpdateToast();
                }
              }
            }
          });
        };

        // If a worker is currently installing, track it immediately
        if (registration.installing) {
          trackInstalling(registration.installing);
        }

        // Listen for new installing workers
        registration.addEventListener("updatefound", () => {
          if (registration.installing) {
            trackInstalling(registration.installing);
          }
        });
      })
      .catch((error) => console.error("Error while preparing: ", error));
  }
});
