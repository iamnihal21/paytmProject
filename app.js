/* ---------- 3 demo users (stands in for a database) ---------- */
const USERS = {
  "9876543210": { name: "Rahul Sharma", upiId: "rahul@paytm", balance: 2450 },
  "9876543211": { name: "Priya Verma",  upiId: "priya@paytm",  balance: 5120 },
  "9876543212": { name: "Amit Patel",   upiId: "amit@paytm",   balance: 780  }
};

/* ---------- screen switching ---------- */
function showScreen(id) {
  document.querySelectorAll(".screen")
          .forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

/* ---------- LOGIN ---------- */
const phoneInput = document.getElementById("phone");
const loginError = document.getElementById("loginError");

function attemptLogin() {
  const phone = phoneInput.value.trim();
  loginError.textContent = "";

  // must be a 10-digit Indian mobile number starting 6-9
  if (!/^[6-9]\d{9}$/.test(phone)) {
    loginError.textContent = "Enter a valid 10-digit mobile number";
    return;
  }

  // must exist in our user list
  if (!USERS[phone]) {
    loginError.textContent = "Number not registered in this demo";
    return;
  }

  // remember who logged in
  localStorage.setItem("paytm_session", phone);

  // show the number on the OTP screen
  document.getElementById("otpPhone").textContent =
    "+91 " + phone.slice(0, 5) + " " + phone.slice(5);

  showScreen("screen-otp");
}

document.getElementById("loginBtn").addEventListener("click", attemptLogin);
phoneInput.addEventListener("keydown", e => {
  if (e.key === "Enter") attemptLogin();
});

/* tap a demo chip to auto-fill */
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    phoneInput.value = chip.dataset.phone;
    loginError.textContent = "";
  });
});

/* ---------- OTP boxes: auto-advance + backspace ---------- */
const otpBoxes = document.querySelectorAll(".otp-box");

otpBoxes.forEach((box, i) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/\D/g, "").slice(-1);
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
  });

  box.addEventListener("keydown", e => {
    if (e.key === "Backspace" && !box.value && i > 0) otpBoxes[i - 1].focus();
  });
});

/* ---------- OTP verify (placeholder for Phase 2) ---------- */
document.getElementById("verifyBtn").addEventListener("click", () => {
  const code = [...otpBoxes].map(b => b.value).join("");
  const msg = document.getElementById("otpMsg");

  if (code.length < 6) {
    msg.textContent = "Enter all 6 digits";
    return;
  }
  msg.textContent = "";
  // Phase 2 replaces this with the real OTP check + Home screen
  alert("OTP screen works. Verification and Home arrive in Phase 2.");
});

/* ---------- back button ---------- */
document.getElementById("otpBack").addEventListener("click", () => {
  otpBoxes.forEach(b => (b.value = ""));
  document.getElementById("otpMsg").textContent = "";
  showScreen("screen-login");
});