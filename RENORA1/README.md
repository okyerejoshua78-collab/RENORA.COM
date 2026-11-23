# RENORA — Official Website Platform

**Motto:** *More Possibilities, Less Spending.*

RENORA is an international product and lifestyle showcase platform designed to start in **Ghana** and expand into the **United States, United Kingdom, Canada, and other international markets**.

> **Important Compliance Notice:**
> Ticket sales, paid entries, random winner draws, and live competitions are intentionally **disabled** in this release. Do not activate participatory features until qualified legal counsel has advised and all required regulatory licenses have been obtained in every target market.

---

## What Is Included

- **Multi-Page Public Storefront & Catalog**: Homepage, Explore & Search Page, 8 Product Category Pages, and Individual Product Pages with clickable multi-photo galleries, specifications, delivery disclosures, and rules.
- **Customer Authentication & Dashboard**: Account creation (First Name, Last Name, Email, Country, Optional Phone, Password), sign in, sign out, email verification, password reset, profile editing, currency preference, notifications, and disabled participation preview.
- **Administrator Console (`/admin`)**: Secure server-verified passcode login (with first-run passcode setup screen if no `ADMIN_PASSCODE` environment variable is set), product add/edit/delete, product photo uploads, category management, customer status management, announcements, FAQs, contact inquiries, and audit logs.
- **Database**: Automatic local SQLite database (`./data/renora.db`) seeded with sample products, categories, FAQs, and announcements on first startup.
- **Multi-Currency Display**: Instant switching between **GHS**, **USD**, **GBP**, and **CAD**.
- **Downloadable Source ZIP**: Built-in `/api/download-project` link in the Footer and About page.

---

## Beginner Installation & Startup Guide

You do not need to be a professional web developer to run this project on your computer. Follow these steps carefully:

### Step 1: Install Node.js
1. Download and install **Node.js (LTS version 20 or 22)** from [https://nodejs.org](https://nodejs.org).
2. Verify it installed by opening your Terminal (Mac/Linux) or Command Prompt (Windows) and running:
   ```bash
   node -v
   npm -v
   ```

### Step 2: Open the Project Folder
1. If you downloaded the ZIP archive, unzip it to a folder such as `renora-website`.
2. Open your Terminal / Command Prompt inside that folder.

### Step 3: Install Required Packages
Run this command once to install all frontend and backend dependencies:
```bash
npm install
```

### Step 4: Configure Environment Variables (Optional)
1. Copy `.env.example` to a new file named `.env`:
   - Mac/Linux: `cp .env.example .env`
   - Windows: `copy .env.example .env`
2. Open `.env` in any text editor (like Notepad or VS Code):
   - **`ADMIN_PASSCODE`**: Set a strong secret passcode (10+ characters) for `/admin`. If you leave it blank, visiting `/admin` for the first time will let you set the passcode directly in the browser.
   - **`PAYSTACK_SECRET_KEY`** *(Optional)*: Add your Paystack secret key for live **Visa card** and **Ghana Mobile Money (MTN, Vodafone, Tigo)** processing. Without this key, Visa runs in Sandbox Test mode and Mobile Money uses manual reference verification.
   - **`PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET`** *(Optional)*: Add your PayPal REST API credentials (`PAYPAL_MODE=sandbox` or `live`) for live **PayPal** checkout.
   - **Bank Transfers & Direct Ghana MoMo**: Configure your settlement bank account and MTN/Vodafone/Tigo merchant numbers directly inside **`/admin` -> Payments & Tickets**.
   - **`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`**: Optional email server credentials for sending real verification and password-reset emails. If left blank, RENORA prints outgoing verification/reset links directly in your terminal window so you can test them locally.

### Step 5: Start the Website
Run:
```bash
npm run dev
```
Then open your web browser and visit:
**`http://localhost:3000`**

---

## Production Build & Startup

When deploying to a live server:
```bash
npm run build
npm start
```

---

## Legal Templates Notice

The Privacy Policy, Terms and Conditions, and Responsible Participation Policy pages included in this project are **draft templates** structured with the **Ghana Data Protection Act, 2012 (Act 843)** and international privacy frameworks in mind. Have a qualified lawyer review and finalize all legal documents before launching to the public.
