/* =========================================================
   1. DATA MODEL
   ========================================================= */
const USERS = {
  "9876543210": { name:"Rahul Sharma", upiId:"rahul@paytm", balance:2450, otp:"482913" },
  "9876543211": { name:"Priya Verma",  upiId:"priya@paytm",  balance:5120, otp:"736451" },
  "9876543212": { name:"Amit Patel",   upiId:"amit@paytm",   balance:780,  otp:"905284" }
};

/* Quick-pay list — a mix of merchants and demo users */
const KNOWN_PAYEES = [
  { name:"Cafe Coffee Day", upiId:"ccd@merchant",       phone:null },
  { name:"BigBasket",       upiId:"bigbasket@merchant", phone:null },
  { name:"Local Kirana",    upiId:"kirana@merchant",    phone:null },
  { name:"Priya Verma",     upiId:"priya@paytm",        phone:"9876543211" },
  { name:"Amit Patel",      upiId:"amit@paytm",         phone:"9876543212" },
  { name:"Rahul Sharma",    upiId:"rahul@paytm",        phone:"9876543210" }
];

/* =========================================================
   2. STORAGE
   ========================================================= */
function readJSON(key){
  try { return JSON.parse(localStorage.getItem(key) || "null"); }
  catch (e) { return null; }
}
function writeJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function saveSession(phone){
  writeJSON("paytm_session", { phone, verified:true, at:Date.now() });
}
function getSession(){
  const s = readJSON("paytm_session");
  return (s && s.verified && USERS[s.phone]) ? s : null;
}
function clearSession(){ localStorage.removeItem("paytm_session"); }

function seedTransactions(){
  const now = Date.now(), H = 3600e3, D = 24*H;
  return [
    { id:"TXN1001", type:"debit",  title:"Cafe Coffee Day",
      subtitle:"Merchant payment",  amount:180,  when:now-2*H,       status:"Success" },
    { id:"TXN1002", type:"debit",  title:"Mobile Recharge · Jio",
      subtitle:"Prepaid ₹239 plan", amount:239,  when:now-26*H,      status:"Success" },
    { id:"TXN1003", type:"credit", title:"Priya Verma",
      subtitle:"UPI received",      amount:500,  when:now-2*D-3*H,   status:"Success" },
    { id:"TXN1004", type:"debit",  title:"Electricity Bill",
      subtitle:"BESCOM",            amount:1240, when:now-3*D,       status:"Success" },
    { id:"TXN1005", type:"debit",  title:"BigBasket",
      subtitle:"Merchant payment",  amount:890,  when:now-5*D,       status:"Success" }
  ];
}

function ensureUserState(phone){
  const key = "paytm_user_" + phone;
  let state = readJSON(key);
  if (!state){
    state = {
      name: USERS[phone].name, upiId: USERS[phone].upiId,
      balance: USERS[phone].balance,
      transactions: seedTransactions(), seeded:true
    };
    writeJSON(key, state);
    return state;
  }
  if (!state.seeded){
    state.transactions = seedTransactions(); state.seeded = true;
    writeJSON(key, state);
  }
  return state;
}

/* =========================================================
   3. NAVIGATION
   ========================================================= */
function navigate(id){
  document.querySelectorAll(".screen")
          .forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (!target) return;
  target.classList.add("active");
  target.scrollTop = 0;

  const withNav = (id === "screen-home" || id === "screen-history");
  document.querySelector(".phone").classList.toggle("has-nav", withNav);

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === id.replace("screen-",""));
  });
}

function requireSession(){
  const s = getSession();
  if (!s){ navigate("screen-login"); return null; }
  return s;
}

/* =========================================================
   4. LOGIN
   ========================================================= */
const phoneInput = document.getElementById("phone");
const loginError = document.getElementById("loginError");

function attemptLogin(){
  const phone = phoneInput.value.trim();
  loginError.textContent = "";
  if (!/^[6-9]\d{9}$/.test(phone)){
    loginError.textContent = "Enter a valid 10-digit mobile number"; return;
  }
  if (!USERS[phone]){
    loginError.textContent = "Number not registered in this demo"; return;
  }
  localStorage.setItem("paytm_pending", phone);
  openOtpScreen(phone);
}

document.getElementById("loginBtn").addEventListener("click", attemptLogin);
phoneInput.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    phoneInput.value = chip.dataset.phone;
    loginError.textContent = "";
  });
});

/* =========================================================
   5. OTP
   ========================================================= */
const otpBoxes = document.querySelectorAll(".otp-box");
const otpMsg   = document.getElementById("otpMsg");
let pendingPhone = null;
let resendTimer  = null;

function setOtpMsg(text, isError){
  otpMsg.textContent = text;
  otpMsg.style.color = isError ? "var(--error)" : "var(--muted)";
}

function openOtpScreen(phone){
  pendingPhone = phone;
  document.getElementById("otpPhone").textContent =
    "+91 " + phone.slice(0,5) + " " + phone.slice(5);
  document.getElementById("demoOtp").textContent = USERS[phone].otp;
  otpBoxes.forEach(b => (b.value = ""));
  setOtpMsg("", true);
  startResendTimer();
  navigate("screen-otp");
  otpBoxes[0].focus();
}

otpBoxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/\D/g, "").slice(-1);
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
  });
  box.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !box.value && i > 0) otpBoxes[i - 1].focus();
  });
});

otpBoxes[0].addEventListener("paste", e => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData)
                 .getData("text").replace(/\D/g, "").slice(0, 6);
  if (!text) return;
  otpBoxes.forEach((b, i) => (b.value = text[i] || ""));
  otpBoxes[Math.min(text.length, 5)].focus();
});

function startResendTimer(){
  const btn = document.getElementById("resendBtn");
  clearInterval(resendTimer);
  let seconds = 30;
  btn.disabled = true;
  btn.textContent = `Resend OTP in ${seconds}s`;
  resendTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0){
      clearInterval(resendTimer);
      btn.disabled = false;
      btn.textContent = "Resend OTP";
    } else {
      btn.textContent = `Resend OTP in ${seconds}s`;
    }
  }, 1000);
}

document.getElementById("resendBtn").addEventListener("click", () => {
  setOtpMsg("OTP resent — the demo code stays the same", false);
  otpBoxes.forEach(b => (b.value = ""));
  otpBoxes[0].focus();
  startResendTimer();
});

document.getElementById("verifyBtn").addEventListener("click", () => {
  const code = [...otpBoxes].map(b => b.value).join("");
  setOtpMsg("", true);
  if (code.length < 6){ setOtpMsg("Enter all 6 digits", true); return; }
  if (!pendingPhone || !USERS[pendingPhone]){
    setOtpMsg("Session expired — start again", true);
    navigate("screen-login"); return;
  }
  if (code !== USERS[pendingPhone].otp){
    setOtpMsg("Incorrect OTP — check the demo code above", true);
    otpBoxes.forEach(b => (b.value = ""));
    otpBoxes[0].focus(); return;
  }
  saveSession(pendingPhone);
  localStorage.removeItem("paytm_pending");
  clearInterval(resendTimer);
  goToHome(pendingPhone);
});

document.getElementById("otpBack").addEventListener("click", () => {
  clearInterval(resendTimer);
  localStorage.removeItem("paytm_pending");
  pendingPhone = null;
  otpBoxes.forEach(b => (b.value = ""));
  setOtpMsg("", true);
  navigate("screen-login");
});

/* =========================================================
   6. TIME FORMATTING + TRANSACTION ROW
   ========================================================= */
function relativeTime(ts){
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + (hrs === 1 ? " hr ago" : " hrs ago");
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7)   return days + " days ago";
  return new Date(ts).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

function txnRow(t){
  const isCredit = t.type === "credit";
  const amt = Number(t.amount).toLocaleString("en-IN");
  return `
    <div class="txn">
      <div class="txn-avatar ${isCredit ? "cr" : "dr"}">${isCredit ? "↓" : "↑"}</div>
      <div class="txn-main">
        <p class="txn-title">${t.title}</p>
        <p class="txn-sub">${t.subtitle} · ${relativeTime(t.when)}</p>
      </div>
      <div class="txn-amt ${isCredit ? "cr" : "dr"}">
        ${isCredit ? "+" : "−"}₹${amt}
      </div>
    </div>`;
}

/* =========================================================
   7. HOME + HISTORY
   ========================================================= */
function goToHome(phone){
  const state = ensureUserState(phone);
  document.getElementById("homeName").textContent    = state.name;
  document.getElementById("homeUpi").textContent     = state.upiId;
  document.getElementById("homeBalance").textContent =
    "₹" + state.balance.toLocaleString("en-IN");

  const recent = state.transactions.slice(0, 3);
  document.getElementById("homeTxns").innerHTML = recent.length
    ? recent.map(txnRow).join("")
    : `<p class="empty">No transactions yet</p>`;

  navigate("screen-home");
}

function openHistory(){
  const session = requireSession();
  if (!session) return;
  const state = ensureUserState(session.phone);
  document.getElementById("historyTxns").innerHTML = state.transactions.length
    ? state.transactions.map(txnRow).join("")
    : `<p class="empty">No transactions yet</p>`;
  navigate("screen-history");
}

/* =========================================================
   8. PAY SCREEN
   ========================================================= */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}$/;
let payAmountStr = "";

const upiInput  = document.getElementById("upiInput");
const upiStatus = document.getElementById("upiStatus");
const payBtn    = document.getElementById("payBtn");
const payError  = document.getElementById("payError");

function openPay(){
  const session = requireSession();
  if (!session) return;

  const state = ensureUserState(session.phone);

  payAmountStr = "";
  upiInput.value = "";
  upiStatus.className = "upi-status";
  document.getElementById("amountValue").textContent = "0";
  payError.textContent = "";
  document.getElementById("payBalance").textContent =
    "₹" + state.balance.toLocaleString("en-IN");

  const quickRow = document.getElementById("quickPayees");
  quickRow.innerHTML = KNOWN_PAYEES
    .filter(p => p.phone !== session.phone)
    .map(p => `<button class="qp" data-upi="${p.upiId}">${p.name}</button>`)
    .join("");
  quickRow.querySelectorAll(".qp").forEach(b => {
    b.addEventListener("click", () => {
      upiInput.value = b.dataset.upi;
      updateUpiStatus();
      updatePayButton();
    });
  });

  updatePayButton();
  navigate("screen-pay");
}

function updateUpiStatus(){
  const val = upiInput.value.trim().toLowerCase();
  const session = getSession();

  if (!val){ upiStatus.className = "upi-status"; return; }
  if (!UPI_RE.test(val)){ upiStatus.className = "upi-status bad"; return; }
  if (session && USERS[session.phone].upiId === val){
    upiStatus.className = "upi-status bad"; return;
  }
  upiStatus.className = "upi-status ok";
}

function parseAmount(){
  const n = parseFloat(payAmountStr);
  return isFinite(n) ? n : 0;
}

function updatePayButton(){
  const amt = parseAmount();
  const upi = upiInput.value.trim().toLowerCase();
  const session = getSession();

  let valid = amt > 0 && UPI_RE.test(upi);
  if (valid && session){
    if (upi === USERS[session.phone].upiId) valid = false;
    const state = ensureUserState(session.phone);
    if (amt > state.balance) valid = false;
  }

  payBtn.disabled = !valid;
  payBtn.textContent = amt > 0
    ? `Pay ₹${amt.toLocaleString("en-IN")}`
    : "Pay ₹0";
}

upiInput.addEventListener("input", () => {
  updateUpiStatus();
  updatePayButton();
});

/* keypad */
document.querySelectorAll("#keypad button").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    payError.textContent = "";

    if (key === "del"){
      payAmountStr = payAmountStr.slice(0, -1);
    } else if (key === "."){
      if (payAmountStr.includes(".")) return;
      if (!payAmountStr) payAmountStr = "0";
      payAmountStr += ".";
    } else {
      if (payAmountStr.includes(".") &&
          payAmountStr.split(".")[1].length >= 2) return;
      if (!payAmountStr.includes(".") && payAmountStr.length >= 7) return;
      if (payAmountStr === "0") payAmountStr = key;
      else payAmountStr += key;
    }

    document.getElementById("amountValue").textContent =
      payAmountStr === "" ? "0" : payAmountStr;
    updatePayButton();
  });
});

/* =========================================================
   9. EXECUTE PAYMENT
   ========================================================= */
function generateTxnId(){
  return "PTM" + Math.floor(100000000 + Math.random() * 900000000);
}

function resolvePayeeName(upi){
  const known = KNOWN_PAYEES.find(p => p.upiId === upi);
  if (known) return known.name;
  const phone = Object.keys(USERS).find(p => USERS[p].upiId === upi);
  if (phone) return USERS[phone].name;
  return upi.split("@")[0];
}

payBtn.addEventListener("click", () => {
  const session = requireSession();
  if (!session) return;

  const upi = upiInput.value.trim().toLowerCase();
  const amt = parseAmount();

  if (!UPI_RE.test(upi)){ payError.textContent = "Enter a valid UPI ID"; return; }
  if (upi === USERS[session.phone].upiId){
    payError.textContent = "You can't pay yourself"; return;
  }
  if (amt <= 0){ payError.textContent = "Enter an amount"; return; }

  const sender = ensureUserState(session.phone);
  if (amt > sender.balance){
    payError.textContent = "Insufficient balance"; return;
  }

  const payeeName = resolvePayeeName(upi);
  const txnId = generateTxnId();
  const now = Date.now();

  /* debit sender */
  sender.balance = +(sender.balance - amt).toFixed(2);
  sender.transactions.unshift({
    id: txnId, type: "debit",
    title: payeeName,
    subtitle: "UPI payment to " + upi,
    amount: amt, when: now, status: "Success"
  });
  writeJSON("paytm_user_" + session.phone, sender);

  /* credit receiver if it's a known demo user */
  const receiverPhone = Object.keys(USERS).find(p => USERS[p].upiId === upi);
  if (receiverPhone && receiverPhone !== session.phone){
    const receiver = ensureUserState(receiverPhone);
    receiver.balance = +(receiver.balance + amt).toFixed(2);
    receiver.transactions.unshift({
      id: "CR" + txnId.slice(-7),
      type: "credit",
      title: sender.name,
      subtitle: "UPI received from " + USERS[session.phone].upiId,
      amount: amt, when: now, status: "Success"
    });
    writeJSON("paytm_user_" + receiverPhone, receiver);
  }

  showSuccess({ txnId, amt, payeeName, upi, when: now });
});

/* =========================================================
   10. SUCCESS SCREEN
   ========================================================= */
function showSuccess({ txnId, amt, payeeName, upi, when }){
  document.getElementById("successAmount").textContent =
    "₹" + amt.toLocaleString("en-IN");
  document.getElementById("successName").textContent   = payeeName;
  document.getElementById("successUpi").textContent    = upi;
  document.getElementById("successTxnId").textContent  = txnId;
  document.getElementById("successTime").textContent   =
    new Date(when).toLocaleString("en-IN", {
      day:"numeric", month:"short", year:"numeric",
      hour:"2-digit", minute:"2-digit"
    });
  navigate("screen-success");
}

document.getElementById("successDone").addEventListener("click", () => {
  const session = requireSession();
  if (session) goToHome(session.phone);
});

document.getElementById("successHistory").addEventListener("click", openHistory);

/* =========================================================
   11. WIRING
   ========================================================= */
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  pendingPhone = null;
  phoneInput.value = "";
  loginError.textContent = "";
  navigate("screen-login");
});

document.getElementById("payBack").addEventListener("click", () => {
  const session = requireSession();
  if (session) goToHome(session.phone);
});

document.getElementById("viewAllBtn").addEventListener("click", openHistory);

document.querySelectorAll(".qa").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "pay")              openPay();
    else if (action === "recharge")    toast("Mobile recharge arrives in Phase 5");
    else                               toast("Bill payments arrive in Phase 5");
  });
});

document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab === "home"){
      const s = requireSession(); if (s) goToHome(s.phone);
    } else if (btn.dataset.tab === "history"){
      openHistory();
    }
  });
});

document.querySelector(".nav-pay").addEventListener("click", openPay);

/* ---------- toast ---------- */
function toast(message){
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2000);
}

/* =========================================================
   12. BOOT
   ========================================================= */
(function boot(){
  const session = getSession();
  if (session){ goToHome(session.phone); return; }
  const pending = localStorage.getItem("paytm_pending");
  if (pending && USERS[pending]){ openOtpScreen(pending); return; }
  navigate("screen-login");
})();

/* =========================================================
   13. PWA — service worker + install prompt
   ========================================================= */

/* ---------- register the service worker ---------- */
if ("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { scope: "./" })
      .catch(err => console.warn("[PWA] service worker not registered:", err));
  });
}

/* ---------- install prompt (Android / desktop Chrome) ---------- */
let deferredPrompt = null;
const installBanner = document.getElementById("installBanner");
const installBtn    = document.getElementById("installBtn");
const installClose  = document.getElementById("installClose");

function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();              // stop the mini-infobar
  deferredPrompt = event;

  if (isStandalone()) return;
  if (localStorage.getItem("paytm_install_dismissed")) return;

  installBanner.hidden = false;
});

if (installBtn){
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    installBanner.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
}

if (installClose){
  installClose.addEventListener("click", () => {
    installBanner.hidden = true;
    localStorage.setItem("paytm_install_dismissed", "1");
  });
}

window.addEventListener("appinstalled", () => {
  installBanner.hidden = true;
  deferredPrompt = null;
  toast("Paytm Pay installed");
});

/* iOS has no beforeinstallprompt — show a one-time hint instead */
(function iosInstallHint(){
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIOS || isStandalone()) return;
  if (localStorage.getItem("paytm_install_dismissed")) return;
  if (localStorage.getItem("paytm_ios_hint_shown")) return;

  setTimeout(() => {
    toast("Tap Share → Add to Home Screen to install");
    localStorage.setItem("paytm_ios_hint_shown", "1");
  }, 4000);
})();