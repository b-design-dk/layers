// js/bootstrap.js

document.addEventListener("DOMContentLoaded", () => {
	if (typeof Vault === "undefined") {
		console.error("Vault not loaded");
		return;
	}

	if (typeof initCrypto === "function") {
		initCrypto();
	}

	if (typeof initAdmin === "function") {
		initAdmin();
	}
	
	if (typeof updateImpactDisplay === "function") {
		updateImpactDisplay();
	}
	
	if ("serviceWorker" in navigator) {
	  window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js");
	  });
	}
});

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("fade-out");

    setTimeout(() => {
      splash.remove();
    }, 400);
  }, 420);
});
