/* Offline support - load service worker only after page finishes loading */
window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./serviceWorker.js")
      .then(() => console.log("Ready for offline use."))
      .catch((error) => console.error("Error while preparing: ", error));
  }
});
