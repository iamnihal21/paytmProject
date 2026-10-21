/* =========================================================
   1. DATA MODEL & CONSTANTS
   ========================================================= */
const USERS = {
  "9876543210": { name: "Rahul Sharma", upiId: "rahul@paytm", balance: 2450, otp: "482913" },
  "9876543211": { name: "Priya Verma", upiId: "priya@paytm", balance: 5120, otp: "736451" },
  "9876543212": { name: "Amit Patel", upiId: "amit@paytm", balance: 780, otp: "905284" }
};

const KNOWN_PAYEES = [
  { name: "Cafe Coffee Day", upiId: "ccd@merchant", phone: null },
  { name: "BigBasket", upiId: "bigbasket@merchant", phone: null },
  { name: "Local Kirana", upiId: "kirana@merchant", phone: null },
  { name: "Priya Verma", upiId: "priya@paytm", phone: "9876543211" },
  { name: "Amit Patel", upiId: "amit@paytm", phone: "9876543212" },
  { name: "Rahul Sharma", upiId: "rahul@paytm", phone: "9876543210" }
];

const OPERATORS = {
  mobile: ["Jio", "Airtel", "Vi", "BSNL"],
  dth: ["Tata Play", "Airtel DTH", "Dish TV", "Sun Direct"]
};
const RECHARGE_AMOUNTS = [199, 239, 299, 399, 499, 719];

const BILL_CATEGORIES = [
  { id: "electricity", name: "Electricity", icon: "⚡" },
  { id: "water", name: "Water", icon: "💧" },
  { id: "gas", name: "Gas", icon: "🔥" },
  { id: "broadband", name: "Broadband", icon: "🌐" }
];

/* =========================================================
   2. STORAGE HELPERS & THEME
   ========================================================= */
function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function saveSession(phone) { writeJSON("paytm_session", { phone, verified: true, at: Date.now() }); }
function getSession() { const s = readJSON("paytm_session"); return (s && s.verified && USERS[s.phone]) ? s : null; }
function clearSession() { localStorage.removeItem("paytm_session"); }

function seedTransactions() {
  const now = Date.now(), H = 3600e3, D = 24 * H;
  return [
    { id: "TXN1001", type: "debit", title: "Cafe Coffee Day", subtitle: "Merchant payment", amount: 180, when: now - 2 * H, status: "Success" },
    { id: "TXN1002", type: "debit", title: "Mobile Recharge · Jio", subtitle: "Prepaid ₹239 plan", amount: 239, when: now - 26 * H, status: "Success" },
    { id: "TXN1003", type: "credit", title: "Priya Verma", subtitle: "UPI received", amount: 500, when: now - 2 * D - 3 * H, status: "Success" },
    { id: "TXN1004", type: "debit", title: "Electricity Bill", subtitle: "BESCOM", amount: 1240, when: now - 3 * D, status: "Success" },
    { id: "TXN1005", type: "debit", title: "BigBasket", subtitle: "Merchant payment", amount: 890, when: now - 5 * D, status: "Success" }
  ];
}

function ensureUserState(phone) {
  const key = "paytm_user_" + phone;
  let state = readJSON(key);
  if (!state) {
    state = { name: USERS[phone].name, upiId: USERS[phone].upiId, balance: USERS[phone].balance, transactions: seedTransactions(), seeded: true };
    writeJSON(key, state); return state;
  }
  if (!state.seeded) { state.transactions = seedTransactions(); state.seeded = true; writeJSON(key, state); }
  return state;
}

function initTheme() {
  const isDark = localStorage.getItem("paytm_theme") === "dark";
  if (isDark) document.documentElement.setAttribute("data-theme", "dark");
  const toggle = document.getElementById("darkModeToggle");
  if (toggle) toggle.checked = isDark;
}
function toggleTheme(e) {
  if (e.target.checked) {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("paytm_theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("paytm_theme", "light");
  }
}

/* =========================================================
   3. NAVIGATION
   ========================================================= */
function navigate(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (!target) return;
  target.classList.add("active");
  target.scrollTop = 0;

  const withNav = ["screen-home", "screen-history", "screen-profile", "screen-recharge", "screen-bills"].includes(id);
  document.querySelector(".phone").classList.toggle("has-nav", withNav);

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === id.replace("screen-", ""));
  });
}

function requireSession() {
  const s = getSession();
  if (!s) { navigate("screen-login"); return null; }
  return s;
}

/* =========================================================
   4. LOGIN & OTP
   ========================================================= */
const phoneInput = document.getElementById("phone");
const loginError = document.getElementById("loginError");

function attemptLogin() {
  const phone = phoneInput.value.trim();
  loginError.textContent = "";
  if (!/^[6-9]\d{9}$/.test(phone)) { loginError.textContent = "Enter a valid 10-digit mobile number"; return; }
  if (!USERS[phone]) { loginError.textContent = "Number not registered in this demo"; return; }
  localStorage.setItem("paytm_pending", phone);
  openOtpScreen(phone);
}

document.getElementById("loginBtn").addEventListener("click", attemptLogin);
phoneInput.addEventListener("keydown", e => { if (e.key === "Enter") attemptLogin(); });
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => { phoneInput.value = chip.dataset.phone; loginError.textContent = ""; });
});

const otpBoxes = document.querySelectorAll(".otp-box");
const otpMsg = document.getElementById("otpMsg");
let pendingPhone = null, resendTimer = null;

function setOtpMsg(text, isError) { otpMsg.textContent = text; otpMsg.style.color = isError ? "var(--error)" : "var(--text-muted)"; }

function openOtpScreen(phone) {
  pendingPhone = phone;
  document.getElementById("otpPhone").textContent = "+91 " + phone.slice(0, 5) + " " + phone.slice(5);
  document.getElementById("demoOtp").textContent = USERS[phone].otp;
  otpBoxes.forEach(b => (b.value = ""));
  setOtpMsg("", true);
  startResendTimer();
  navigate("screen-otp");
  setTimeout(() => otpBoxes[0].focus(), 100);
}

otpBoxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/\D/g, "").slice(-1);
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
  });
  box.addEventListener("keydown", e => { if (e.key === "Backspace" && !box.value && i > 0) otpBoxes[i - 1].focus(); });
});

otpBoxes[0].addEventListener("paste", e => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
  if (!text) return;
  otpBoxes.forEach((b, i) => (b.value = text[i] || ""));
  otpBoxes[Math.min(text.length, 5)].focus();
});

function startResendTimer() {
  const btn = document.getElementById("resendBtn");
  clearInterval(resendTimer);
  let seconds = 30;
  btn.disabled = true;
  btn.textContent = `Resend OTP in ${seconds}s`;
  resendTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0) { clearInterval(resendTimer); btn.disabled = false; btn.textContent = "Resend OTP"; }
    else { btn.textContent = `Resend OTP in ${seconds}s`; }
  }, 1000);
}

document.getElementById("resendBtn").addEventListener("click", () => { setOtpMsg("OTP resent", false); otpBoxes.forEach(b => (b.value = "")); otpBoxes[0].focus(); startResendTimer(); });

document.getElementById("verifyBtn").addEventListener("click", () => {
  const code = [...otpBoxes].map(b => b.value).join("");
  setOtpMsg("", true);
  if (code.length < 6) { setOtpMsg("Enter all 6 digits", true); return; }
  if (code !== USERS[pendingPhone].otp) { setOtpMsg("Incorrect OTP", true); otpBoxes.forEach(b => (b.value = "")); otpBoxes[0].focus(); return; }
  saveSession(pendingPhone);
  localStorage.removeItem("paytm_pending");
  clearInterval(resendTimer);
  goToHome(pendingPhone);
});

document.getElementById("otpBack").addEventListener("click", () => {
  clearInterval(resendTimer); localStorage.removeItem("paytm_pending"); pendingPhone = null;
  otpBoxes.forEach(b => (b.value = "")); setOtpMsg("", true); navigate("screen-login");
});

/* =========================================================
   5. FORMATTING & TXN ROW
   ========================================================= */
function relativeTime(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? " hr ago" : " hrs ago");
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return days + " days ago";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function txnRow(t) {
  const isCredit = t.type === "credit";
  const amt = Number(t.amount).toLocaleString("en-IN");
  return `
    <div class="txn" onclick="viewTxnDetails('${t.id}')">
      <div class="txn-avatar ${isCredit ? "cr" : "dr"}">${isCredit ? "↓" : "↑"}</div>
      <div class="txn-main">
        <p class="txn-title">${t.title}</p>
        <p class="txn-sub">${t.subtitle} · ${relativeTime(t.when)}</p>
      </div>
      <div class="txn-amt ${isCredit ? "cr" : "dr"}">${isCredit ? "+" : "−"}₹${amt}</div>
    </div>`;
}

/* =========================================================
   6. HOME, HISTORY & PROFILE
   ========================================================= */
function goToHome(phone) {
  const state = ensureUserState(phone);
  document.getElementById("homeName").textContent = state.name.split(" ")[0];
  document.getElementById("homeUpi").textContent = state.upiId;
  document.getElementById("homeAvatar").textContent = state.name.charAt(0);
  document.getElementById("homeBalance").textContent = "₹" + state.balance.toLocaleString("en-IN");

  const recent = state.transactions.slice(0, 3);
  document.getElementById("homeTxns").innerHTML = recent.length ? recent.map(txnRow).join("") : `<p class="empty">No transactions yet</p>`;
  navigate("screen-home");
}

function openHistory() {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);
  document.getElementById("historyTxns").innerHTML = state.transactions.length ? state.transactions.map(txnRow).join("") : `<p class="empty">No transactions yet</p>`;
  navigate("screen-history");
}

function openProfile() {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);
  document.getElementById("profileName").textContent = state.name;
  document.getElementById("profileUpi").textContent = state.upiId;
  document.getElementById("profileAvatar").textContent = state.name.charAt(0);
  navigate("screen-profile");
}

window.viewTxnDetails = function (txnId) {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);
  const t = state.transactions.find(x => x.id === txnId);
  if (!t) return;

  const isCr = t.type === "credit";
  const iconEl = document.getElementById("detailIcon");
  iconEl.className = "txn-detail-icon " + (isCr ? "credit" : "debit");
  iconEl.textContent = isCr ? "↓" : "↑";

  document.getElementById("detailAmount").textContent = (isCr ? "+" : "−") + "₹" + t.amount.toLocaleString("en-IN");
  document.getElementById("detailAmount").style.color = isCr ? "var(--success)" : "var(--text)";
  document.getElementById("detailStatus").textContent = t.status;
  document.getElementById("detailName").textContent = t.title;
  document.getElementById("detailType").textContent = t.subtitle;
  document.getElementById("detailId").textContent = t.id;
  document.getElementById("detailTime").textContent = new Date(t.when).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  navigate("screen-txn-details");
};

/* =========================================================
   7. PAY SCREEN
   ========================================================= */
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9]{2,}$/;
let payAmountStr = "";
const upiInput = document.getElementById("upiInput");
const upiStatus = document.getElementById("upiStatus");
const payBtn = document.getElementById("payBtn");
const payError = document.getElementById("payError");

function openPay() {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);
  payAmountStr = ""; upiInput.value = ""; upiStatus.className = "upi-status";
  document.getElementById("amountValue").textContent = "0";
  payError.textContent = "";
  document.getElementById("payBalance").textContent = "₹" + state.balance.toLocaleString("en-IN");

  const quickRow = document.getElementById("quickPayees");
  quickRow.innerHTML = KNOWN_PAYEES.filter(p => p.phone !== session.phone).map(p => `<button class="qp" data-upi="${p.upiId}">${p.name}</button>`).join("");
  quickRow.querySelectorAll(".qp").forEach(b => {
    b.addEventListener("click", () => { upiInput.value = b.dataset.upi; updateUpiStatus(); updatePayButton(); });
  });

  updatePayButton();
  navigate("screen-pay");
}

function updateUpiStatus() {
  const val = upiInput.value.trim().toLowerCase();
  const session = getSession();
  if (!val) { upiStatus.className = "upi-status"; return; }
  if (!UPI_RE.test(val)) { upiStatus.className = "upi-status bad"; return; }
  if (session && USERS[session.phone].upiId === val) { upiStatus.className = "upi-status bad"; return; }
  upiStatus.className = "upi-status ok";
}

function parseAmount() { const n = parseFloat(payAmountStr); return isFinite(n) ? n : 0; }

function updatePayButton() {
  const amt = parseAmount();
  const upi = upiInput.value.trim().toLowerCase();
  const session = getSession();
  let valid = amt > 0 && UPI_RE.test(upi);
  if (valid && session) {
    if (upi === USERS[session.phone].upiId) valid = false;
    const state = ensureUserState(session.phone);
    if (amt > state.balance) valid = false;
  }
  payBtn.disabled = !valid;
  payBtn.textContent = amt > 0 ? `Pay ₹${amt.toLocaleString("en-IN")}` : "Pay ₹0";
}

upiInput.addEventListener("input", () => { updateUpiStatus(); updatePayButton(); });

document.querySelectorAll("#keypad button").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;
    payError.textContent = "";
    if (key === "del") { payAmountStr = payAmountStr.slice(0, -1); }
    else if (key === ".") {
      if (payAmountStr.includes(".")) return;
      if (!payAmountStr) payAmountStr = "0";
      payAmountStr += ".";
    } else {
      if (payAmountStr.includes(".") && payAmountStr.split(".")[1].length >= 2) return;
      if (!payAmountStr.includes(".") && payAmountStr.length >= 7) return;
      if (payAmountStr === "0") payAmountStr = key; else payAmountStr += key;
    }
    document.getElementById("amountValue").textContent = payAmountStr === "" ? "0" : payAmountStr;
    updatePayButton();
  });
});

/* =========================================================
   8. EXECUTE PAYMENT
   ========================================================= */
function generateTxnId() { return "PTM" + Math.floor(100000000 + Math.random() * 900000000); }
function resolvePayeeName(upi) {
  const known = KNOWN_PAYEES.find(p => p.upiId === upi); if (known) return known.name;
  const phone = Object.keys(USERS).find(p => USERS[p].upiId === upi); if (phone) return USERS[phone].name;
  return upi.split("@")[0];
}

payBtn.addEventListener("click", () => {
  const session = requireSession(); if (!session) return;
  const upi = upiInput.value.trim().toLowerCase();
  const amt = parseAmount();

  if (!UPI_RE.test(upi)) { payError.textContent = "Enter a valid UPI ID"; return; }
  if (upi === USERS[session.phone].upiId) { payError.textContent = "You can't pay yourself"; return; }
  if (amt <= 0) { payError.textContent = "Enter an amount"; return; }

  const sender = ensureUserState(session.phone);
  if (amt > sender.balance) { payError.textContent = "Insufficient balance"; return; }

  const payeeName = resolvePayeeName(upi);
  const txnId = generateTxnId();
  const now = Date.now();

  sender.balance = +(sender.balance - amt).toFixed(2);
  sender.transactions.unshift({ id: txnId, type: "debit", title: payeeName, subtitle: "UPI payment", amount: amt, when: now, status: "Success" });
  writeJSON("paytm_user_" + session.phone, sender);

  const receiverPhone = Object.keys(USERS).find(p => USERS[p].upiId === upi);
  if (receiverPhone && receiverPhone !== session.phone) {
    const receiver = ensureUserState(receiverPhone);
    receiver.balance = +(receiver.balance + amt).toFixed(2);
    receiver.transactions.unshift({ id: "CR" + txnId.slice(-7), type: "credit", title: sender.name, subtitle: "UPI received", amount: amt, when: now, status: "Success" });
    writeJSON("paytm_user_" + receiverPhone, receiver);
  }

  showSuccess({ txnId, amt, payeeName, upi, when: now });
});

/* =========================================================
   9. SUCCESS SCREEN
   ========================================================= */
function showSuccess({ txnId, amt, payeeName, upi, when }) {
  document.getElementById("successTitle").textContent = "Payment Successful";
  document.getElementById("successToLabel").textContent = "To";
  document.getElementById("successUpiLabel").textContent = "UPI ID";

  document.getElementById("successAmount").textContent = "₹" + amt.toLocaleString("en-IN");
  document.getElementById("successName").textContent = payeeName;
  document.getElementById("successUpi").textContent = upi;
  document.getElementById("successTxnId").textContent = txnId;
  document.getElementById("successTime").textContent = new Date(when).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  navigate("screen-success");
}

/* =========================================================
   10. EXTRA FEATURES (Add Money & Theme)
   ========================================================= */
document.getElementById("addMoneyBtn").addEventListener("click", () => {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);

  state.balance += 500;
  state.transactions.unshift({
    id: "ADD" + Date.now(), type: "credit", title: "Bank Transfer",
    subtitle: "Added to wallet", amount: 500, when: Date.now(), status: "Success"
  });
  writeJSON("paytm_user_" + session.phone, state);

  toast("₹500 Added successfully!");
  goToHome(session.phone);
});

document.getElementById("darkModeToggle").addEventListener("change", toggleTheme);

/* =========================================================
   11. RECHARGE LOGIC
   ========================================================= */
let currentRechargeType = "mobile";
let selectedOperator = "";
let selectedRechargeAmt = 0;

function openRecharge() {
  const session = requireSession(); if (!session) return;
  currentRechargeType = "mobile"; selectedOperator = ""; selectedRechargeAmt = 0;
  document.getElementById("rechargeNumber").value = "";
  document.getElementById("rechargeError").textContent = "";
  document.querySelectorAll(".r-tab").forEach(t => t.classList.toggle("active", t.dataset.type === "mobile"));
  document.getElementById("rechargeLabel").textContent = "Mobile Number";
  document.getElementById("rechargeNumber").maxLength = 10;
  document.getElementById("rechargeNumber").placeholder = "Enter 10-digit number";
  renderOperators(); renderAmounts(); validateRecharge();
  navigate("screen-recharge");
}

function renderOperators() {
  document.getElementById("operatorGrid").innerHTML = OPERATORS[currentRechargeType].map(op =>
    `<button class="op-btn ${selectedOperator === op ? 'active' : ''}" onclick="selectOperator('${op}')">${op}</button>`
  ).join("");
}

function renderAmounts() {
  document.getElementById("rechargeAmounts").innerHTML = RECHARGE_AMOUNTS.map(amt =>
    `<button class="amt-chip ${selectedRechargeAmt === amt ? 'active' : ''}" onclick="selectRechargeAmt(${amt})">₹${amt}</button>`
  ).join("");
}

window.selectOperator = function (op) { selectedOperator = op; renderOperators(); validateRecharge(); };
window.selectRechargeAmt = function (amt) { selectedRechargeAmt = amt; renderAmounts(); validateRecharge(); };

document.querySelectorAll(".r-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    currentRechargeType = tab.dataset.type; selectedOperator = "";
    document.querySelectorAll(".r-tab").forEach(t => t.classList.remove("active")); tab.classList.add("active");
    if (currentRechargeType === "mobile") {
      document.getElementById("rechargeLabel").textContent = "Mobile Number";
      document.getElementById("rechargeNumber").maxLength = 10;
      document.getElementById("rechargeNumber").placeholder = "Enter 10-digit number";
    } else {
      document.getElementById("rechargeLabel").textContent = "Subscriber ID";
      document.getElementById("rechargeNumber").maxLength = 12;
      document.getElementById("rechargeNumber").placeholder = "Enter Subscriber ID";
    }
    renderOperators(); validateRecharge();
  });
});

document.getElementById("rechargeNumber").addEventListener("input", validateRecharge);

function validateRecharge() {
  const session = getSession(); if (!session) return;
  const num = document.getElementById("rechargeNumber").value.trim();
  const btn = document.getElementById("rechargeProceedBtn");
  const err = document.getElementById("rechargeError");
  err.textContent = "";
  let valid = true;
  if (num.length < 10) valid = false;
  if (!selectedOperator) valid = false;
  if (selectedRechargeAmt <= 0) valid = false;
  const state = ensureUserState(session.phone);
  if (selectedRechargeAmt > state.balance) {
    valid = false;
    if (num.length >= 10) err.textContent = "Insufficient balance for this recharge";
  }
  btn.disabled = !valid;
  btn.textContent = selectedRechargeAmt > 0 ? `Pay ₹${selectedRechargeAmt}` : "Proceed to Pay";
}

document.getElementById("rechargeProceedBtn").addEventListener("click", () => {
  const session = requireSession(); if (!session) return;
  const state = ensureUserState(session.phone);
  const number = document.getElementById("rechargeNumber").value.trim();
  const amt = selectedRechargeAmt, operator = selectedOperator;
  if (amt > state.balance) { document.getElementById("rechargeError").textContent = "Insufficient balance"; return; }

  const txnId = "RCH" + Math.floor(100000000 + Math.random() * 900000000);
  state.balance = +(state.balance - amt).toFixed(2);
  const title = `${operator} ${currentRechargeType === "mobile" ? "Prepaid" : "DTH"}`;
  state.transactions.unshift({ id: txnId, type: "debit", title: title, subtitle: `Recharge for ${number}`, amount: amt, when: Date.now(), status: "Success" });
  writeJSON("paytm_user_" + session.phone, state);

  document.getElementById("successTitle").textContent = "Recharge Successful";
  document.getElementById("successToLabel").textContent = "Operator";
  document.getElementById("successUpiLabel").textContent = "Number";
  document.getElementById("successAmount").textContent = "₹" + amt.toLocaleString("en-IN");
  document.getElementById("successName").textContent = operator;
  document.getElementById("successUpi").textContent = number;
  document.getElementById("successTxnId").textContent = txnId;
  document.getElementById("successTime").textContent = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  navigate("screen-success");
});

document.getElementById("rechargeBack").addEventListener("click", () => { const s = requireSession(); if (s) goToHome(s.phone); });

/* =========================================================
   12. BILLS LOGIC
   ========================================================= */
let currentBillType = "electricity";
let fetchedBillData = null;

function openBills() {
  const session = requireSession(); if (!session) return;
  currentBillType = "electricity"; fetchedBillData = null;
  document.getElementById("consumerNumber").value = "";
  document.getElementById("consumerLabel").textContent = "Consumer Number";
  document.getElementById("billDetailsSection").style.display = "none";
  document.getElementById("billInputSection").style.display = "block";
  document.getElementById("billError").textContent = "";
  renderBillCategories(); validateBillInput();
  navigate("screen-bills");
}

function renderBillCategories() {
  document.getElementById("billCategories").innerHTML = BILL_CATEGORIES.map(cat => `
    <button class="cat-btn ${currentBillType === cat.id ? 'active' : ''}" onclick="selectBillCategory('${cat.id}')">
      <div class="cat-icon">${cat.icon}</div><span>${cat.name}</span>
    </button>`).join("");
}

window.selectBillCategory = function (id) {
  currentBillType = id; renderBillCategories();
  document.getElementById("billDetailsSection").style.display = "none";
  document.getElementById("billInputSection").style.display = "block";
  validateBillInput();
};

document.getElementById("consumerNumber").addEventListener("input", validateBillInput);

function validateBillInput() {
  document.getElementById("fetchBillBtn").disabled = document.getElementById("consumerNumber").value.trim().length < 6;
}

document.getElementById("fetchBillBtn").addEventListener("click", () => {
  const btn = document.getElementById("fetchBillBtn");
  const originalText = btn.textContent;
  const session = requireSession(); if (!session) return;
  btn.innerHTML = '<span class="spinner"></span> Fetching...'; btn.disabled = true;

  setTimeout(() => {
    const amt = Math.floor(400 + Math.random() * 1100);
    fetchedBillData = { name: USERS[session.phone].name, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), amount: amt };
    document.getElementById("billName").textContent = fetchedBillData.name;
    document.getElementById("billDueDate").textContent = fetchedBillData.dueDate;
    document.getElementById("billAmount").textContent = "₹" + fetchedBillData.amount.toLocaleString("en-IN");
    document.getElementById("payBillBtn").textContent = `Pay ₹${fetchedBillData.amount}`;
    btn.textContent = originalText; validateBillInput();
    document.getElementById("billInputSection").style.display = "none";
    document.getElementById("billDetailsSection").style.display = "block";
  }, 1200);
});

document.getElementById("cancelBillBtn").addEventListener("click", () => {
  document.getElementById("billDetailsSection").style.display = "none";
  document.getElementById("billInputSection").style.display = "block";
  fetchedBillData = null;
});

document.getElementById("payBillBtn").addEventListener("click", () => {
  const session = requireSession(); if (!session || !fetchedBillData) return;
  const state = ensureUserState(session.phone);
  const amt = fetchedBillData.amount;

  if (amt > state.balance) { document.getElementById("billError").textContent = "Insufficient balance to pay this bill."; return; }

  state.balance = +(state.balance - amt).toFixed(2);
  const txnId = "BIL" + Math.floor(100000000 + Math.random() * 900000000);
  const catName = BILL_CATEGORIES.find(c => c.id === currentBillType).name;
  state.transactions.unshift({ id: txnId, type: "debit", title: `${catName} Bill`, subtitle: `Consumer No: ${document.getElementById("consumerNumber").value.trim()}`, amount: amt, when: Date.now(), status: "Success" });
  writeJSON("paytm_user_" + session.phone, state);

  document.getElementById("successTitle").textContent = "Bill Paid Successfully";
  document.getElementById("successToLabel").textContent = "Board";
  document.getElementById("successUpiLabel").textContent = "Consumer No";
  document.getElementById("successAmount").textContent = "₹" + amt.toLocaleString("en-IN");
  document.getElementById("successName").textContent = `${catName} Board`;
  document.getElementById("successUpi").textContent = document.getElementById("consumerNumber").value.trim();
  document.getElementById("successTxnId").textContent = txnId;
  document.getElementById("successTime").textContent = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  navigate("screen-success");
});

document.getElementById("billsBack").addEventListener("click", () => { const s = requireSession(); if (s) goToHome(s.phone); });

/* =========================================================
   13. WIRING & BOOT
   ========================================================= */
document.getElementById("successDone").addEventListener("click", () => { const s = requireSession(); if (s) goToHome(s.phone); });
document.getElementById("successHistory").addEventListener("click", openHistory);
document.getElementById("payBack").addEventListener("click", () => { const s = requireSession(); if (s) goToHome(s.phone); });
document.getElementById("viewAllBtn").addEventListener("click", openHistory);
document.getElementById("txnBack").addEventListener("click", openHistory);
document.getElementById("downloadReceiptBtn").addEventListener("click", () => toast("Receipt downloaded (Demo)"));

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession(); pendingPhone = null; phoneInput.value = ""; loginError.textContent = ""; navigate("screen-login");
});

document.querySelectorAll(".qa, .nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    const tab = btn.dataset.tab;

    if (action === "pay") openPay();
    else if (action === "recharge") openRecharge();
    else if (action === "bills") openBills();
    else if (tab === "home") { const s = requireSession(); if (s) goToHome(s.phone); }
    else if (tab === "history") openHistory();
    else if (tab === "profile") openProfile();
  });
});

document.querySelector(".nav-pay").addEventListener("click", openPay);

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message; el.classList.add("show");
  clearTimeout(toast._timer); toast._timer = setTimeout(() => el.classList.remove("show"), 2500);
}

/* =========================================================
   14. PWA INSTALL PROMPT LOGIC
   ========================================================= */
/* =========================================================
   14. PWA INSTALL PROMPT & SERVICE WORKER
   ========================================================= */
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); 
  deferredPrompt = e;
  console.log("✅ Install Prompt is ready!");
  
  const manualBtn = document.getElementById("manualInstallBtn");
  if (manualBtn) manualBtn.style.display = "flex";
  
  if (!window.matchMedia("(display-mode: standalone)").matches && !localStorage.getItem("paytm_install_dismissed")) {
    document.getElementById("installBanner").hidden = false;
  }
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  document.getElementById("installBanner").hidden = true;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

document.getElementById("manualInstallBtn")?.addEventListener("click", async () => {
  if (!deferredPrompt) {
    alert("App is already installed or browser doesn't support it.");
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById("manualInstallBtn").style.display = "none";
});

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
