/* =========================================================
   14. PWA INSTALL PROMPT & SERVICE WORKER
   ========================================================= */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log("✅ Native install prompt is ready!");
  
  // Show the automatic banner if they haven't dismissed it
  const banner = document.getElementById("installBanner");
  if (banner && !localStorage.getItem("paytm_install_dismissed")) {
    banner.hidden = false;
  }
});

// The function that triggers the install
function triggerInstall() {
  if (!deferredPrompt) {
    // If Chrome blocked it (e.g., missing icon or already installed)
    alert("To install:\n1. Tap the 3 dots (menu) at the top right of Chrome.\n2. Tap 'Install app' or 'Add to Home screen'.");
    return;
  }
  
  // Trigger the native Chrome popup
  deferredPrompt.prompt();
  
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User installed the app');
    }
    deferredPrompt = null;
    document.getElementById("installBanner").hidden = true;
  });
}

// Attach the trigger to BOTH the banner button and the Profile button
document.getElementById("installBtn")?.addEventListener("click", triggerInstall);
document.getElementById("manualInstallBtn")?.addEventListener("click", triggerInstall);

document.getElementById("installClose")?.addEventListener("click", () => {
  document.getElementById("installBanner").hidden = true;
  localStorage.setItem("paytm_install_dismissed", "1");
});

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("✅ Service Worker Registered"))
      .catch(err => console.error("❌ SW Registration Failed:", err));
  });
}

/* INITIAL BOOT */
(function boot(){
  initTheme();
  const session = getSession();
  if (session){ goToHome(session.phone); return; }
  const pending = localStorage.getItem("paytm_pending");
  if (pending && USERS[pending]){ openOtpScreen(pending); return; }
  navigate("screen-login");
})();
