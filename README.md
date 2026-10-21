# Paytm Pay — Digital Payments Platform (Prototype)

An offline-first, installable Progressive Web App (PWA) that simulates a UPI-based digital payments platform. Built as an academic prototype, it demonstrates secure login, OTP verification, wallet balance management, peer-to-peer money transfer, and transaction history.

## 🚀 Live Demo
- **Deployed URL:** `[Insert your Vercel URL here]`
- **Test on Mobile:** Open the URL in Chrome on Android and tap **"Install Paytm Pay"** to use it as a native app.

## 🔑 Demo Accounts
Since this is a prototype without an SMS gateway, the OTP is displayed on the screen. Tap a chip on the login screen to auto-fill the numbers.

| Phone Number | Name | Balance | OTP |
| :--- | :--- | :--- | :--- |
| `9876543210` | Rahul Sharma | ₹2,450 | `482913` |
| `9876543211` | Priya Verma | ₹5,120 | `736451` |
| `9876543212` | Amit Patel | ₹780 | `905284` |

## ✨ Core Features
1. **Authentication:** Mobile number validation + 6-digit OTP with a 30-second resend timer.
2. **Dashboard:** Live balance display, quick action buttons, and recent transactions.
3. **Payments:** Enter a UPI ID (or tap a quick-payee chip), use the custom numeric keypad, and validate balance before sending.
4. **P2P Transfer:** Paying a known demo user (e.g., `priya@paytm`) actually debits the sender and credits the receiver's account.
5. **Transaction History:** Full scrollable list of past credits and debits.
6. **PWA/Offline Mode:** Service worker caches the app shell. The app loads and functions offline.

## 🏗️ Architecture & Tech Stack
This project uses a modern, serverless client-side architecture (no backend required).
- **Frontend:** Vanilla HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript.
- **Database:** Browser `localStorage` (acts as the database, storing JSON objects under `paytm_user_[phone]`).
- **PWA Features:** `manifest.webmanifest` (app identity), `sw.js` (Service Worker for caching), `env(safe-area-inset)` for notch support.
- **Hosting:** Vercel (auto-deploys on `git push`).

### File Structure
```text
├── index.html            # All 6 screens (Login, OTP, Home, Pay, Success, History)
├── styles.css            # Styling, animations, and responsive safe-area handling
├── app.js                # App logic, routing, state management, local storage
├── sw.js                 # Service Worker (Offline caching & network strategies)
├── manifest.webmanifest  # PWA configuration (Icons, theme color, display mode)
├── vercel.json           # Vercel headers (ensures sw.js is never aggressively cached)
└── icons/                # App icons (192x192 and 512x512 PNGs)