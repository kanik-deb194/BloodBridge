# 🩸 BloodBridge — Donate & Save Lives

<div align="center">

![BloodBridge](https://img.shields.io/badge/BloodBridge-Blood%20Donation%20Platform-C0162C?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyMi41QzkuMiAxOS4zIDQgMTQuNCA0IDkuNUM0IDYuNCA2LjQgNCA5LjUgNGMxLjIgMCAyLjQuNCAzLjMgMS4xQzEzLjcgNC40IDE0LjkgNCAxNiA0YzMuMSAwIDUuNSAyLjQgNS41IDUuNSAwIDQuOS01LjIgOS44LTguIDEzeiIvPjwvc3ZnPg==)
![PHP](https://img.shields.io/badge/PHP-7.4+-777BB4?style=for-the-badge&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-5.7+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A real-time, multi-role blood donation and management platform built for Bangladesh**

[🎬 Video Demo](https://drive.google.com/file/d/1Bw3IeGe4PkMJUegp5LB3joicg7k49Irx/view?usp=drive_link) · [📋 Features](#-features) · [🚀 Installation](#-installation) · [📸 Screenshots](#-screenshots)

</div>

---

## 📖 About

**BloodBridge** is a comprehensive web-based blood donation and management platform that connects **donors**, **recipients**, **blood banks**, **hospitals**, **medical colleges**, **lab technicians**, and **doctors** in a single coordinated workflow. Built to solve the critical problem of blood shortages and delayed emergency response in Bangladesh.

> *"Every Drop Can Save a Life"*

Bangladesh requires approximately 1 million units of blood annually, yet a substantial portion of this demand goes unmet due to fragmented donation systems and lack of real-time coordination. BloodBridge addresses this directly with a unified, multi-role platform covering the entire blood supply chain — from voluntary pledge to emergency broadcast to drone-simulated delivery.

---

## 📸 Screenshots

### Landing Page
![Landing Page](https://github.com/user-attachments/assets/a82603f5-8672-48ca-843f-3e2016f8be61)
*Live blood network ticker, real-time stock status, and Emergency Request CTA*

### Sign In
![Sign In](https://github.com/user-attachments/assets/4cb458c4-4465-414c-9b44-672dfc80b97e)
*Email/password login with Google and GitHub OAuth*

### Admin Dashboard
![Admin Dashboard](https://github.com/user-attachments/assets/01fd836d-2607-48b7-bb0d-190d1f9cc4c1)
*Real-time KPIs: registered blood banks, suspicious flags, under-rated banks, and blood stock heatmap*

### Donor & Recipient Dashboard
![Donor Dashboard](https://github.com/user-attachments/assets/dd904927-5147-4ced-ae72-298685aca753)
*Blood group, donations, trust score, active requests, lives saved, and admin warning alerts*

### Blood Bank Portal
![Blood Bank Dashboard](https://raw.githubusercontent.com/kanik-deb194/project/main/screenshots/bank_dash.png)
*Stock KPIs, badge status (Standard/Silver/Gold), and quick actions grid*

> 📹 **Full walkthrough** — all 6 dashboards and 71 features: [Watch Video Demo](https://drive.google.com/file/d/1Bw3IeGe4PkMJUegp5LB3joicg7k49Irx/view?usp=drive_link)

---

## ✨ Features

BloodBridge covers **71 documented features** across 8 portals. Highlights by role:

| Role | Key Features |
|---|---|
| **Donor & Recipient** | 4-step blood request wizard (GPS + bank availability), voice requests, drone tracking, newborn blood group predictor, thalassemia couple alert, badges & rewards |
| **Blood Bank** | FEFO inventory, expiry alert dashboard (Critical ≤2d / Warning 3–5d / Notice 6–7d), cold chain monitoring, drone delivery simulation, donor leaderboard |
| **Lab Technician** | Culture test queue, quarantine management, thalassemia flagging with PDF export, antibody records |
| **Doctor** | Transfusion approvals, thalassemia carrier screening, pregnancy risk assessment, crossmatch management |
| **Hospital / Medical College** | Emergency broadcast SOS, patient registry, delivery simulation with stage tracking, demand analytics + signal map |
| **Admin** | Suspicious activity investigation, blood bank rating monitoring, system-wide expiry analytics, thalassemia carrier registry, user management |
| **Raktosathi AI** | Context-aware blood donation chatbot (Groq API), quick-reply buttons, complex eligibility queries |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 7.4+ |
| Database | MySQL 5.7+ (98+ tables, 3NF normalized) |
| Frontend | Vanilla JavaScript (ES6+) |
| Styling | Custom CSS with CSS Variables |
| Maps | Leaflet.js |
| PDF Generation | jsPDF |
| Payment | SSLCommerz (bKash, Nagad, cards) |
| AI Chatbot | Groq API (client-side) |
| Authentication | Session-based + Google OAuth + GitHub OAuth |
| Email | PHPMailer |
| Server | Apache (XAMPP / WAMP / LAMP) |

---

## 🚀 Installation

### Prerequisites
- XAMPP / WAMP / LAMP
- PHP 7.4+
- MySQL 5.7+

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/kanik-deb194/project.git
cd project
```

**2. Set up the database**
- Open phpMyAdmin
- Create a new database named `blood_bridge`
- Import `blood_bridge.sql` (available in [Google Drive](https://drive.google.com/drive/folders/1OM94Mz9uwFE8f7fnakHWRFNWuueSgpZF?usp=drive_link))

**3. Configure credentials**

For **local development**, copy `.env.example` to `.env` and fill in your values:
```env
DB_HOST=localhost
DB_NAME=blood_bridge
DB_USER=root
DB_PASS=

GROQ_API_KEY=your_groq_api_key
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

SSLCZ_STORE_ID=your_store_id
SSLCZ_STORE_PASSWD=your_store_password

BASE_URL=http://localhost/BloodBridge/practice/
```

> ⚠️ **Shared hosting note:** If deploying to a host that restricts `.env` file access (e.g. InfinityFree), credentials must be hardcoded directly in `config.php`. Never commit secrets to version control regardless of method.

**4. Place project in your web root**
```
C:\xampp\htdocs\BloodBridge\
```

**5. Start Apache & MySQL, then open in browser**
```
http://localhost/BloodBridge/practice/
```

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@bloodbridge.com | admin123 |
| Blood Bank | bank@bloodbridge.com | bank123 |
| Donor/Recipient | donor@bloodbridge.com | donor123 |

> ⛔ Change all credentials immediately after first login.

---

## 📁 Project Structure

```
BloodBridge/
├── practice/
│   ├── config.php                  # DB connection
│   ├── config_api.php              # API keys
│   ├── oauth_config.php            # Google OAuth
│   ├── sslcommerz_config.php       # SSLCommerz
│   │
│   ├── admin_api.php               # Admin backend
│   ├── bank_api.php                # Blood bank backend
│   ├── doctor_api.php              # Doctor backend
│   ├── donor_recipient_api.php     # Donor/recipient backend
│   ├── hospital_api.php            # Hospital backend
│   ├── lab_api.php                 # Lab technician backend
│   ├── mc_api.php                  # Medical college backend
│   ├── delivery_api.php            # Delivery staff backend
│   │
│   ├── admindash.html/js/css       # Admin dashboard
│   ├── bankdash.html/js/css        # Blood bank dashboard
│   ├── doctor_dash.*               # Doctor dashboard
│   ├── donor_recipient_dash.*      # Donor/recipient dashboard
│   ├── hospital_dash.*             # Hospital dashboard
│   ├── lab_technician_dash.*       # Lab technician dashboard
│   ├── medical_college_dash.*      # Medical college dashboard
│   │
│   ├── landing_page.*              # Public landing page
│   ├── login.*                     # Login page
│   ├── signup.*                    # Signup page
│   │
│   ├── sslcommerz_init.php         # Payment initiation
│   ├── payment_success.php
│   ├── payment_fail.php
│   ├── payment_cancel.php
│   │
│   └── .env.example                # Environment template
└── README.md
```

---

## 🗄️ Database

The platform uses **MySQL** with a highly normalized (3NF) schema covering **98+ tables** across:

- User management & role-specific profiles
- Blood bag lifecycle (collection → quarantine → dispatch → transfusion)
- Lab culture tests & antibody records
- Cold chain temperature logs
- Emergency requests & broadcast logs
- Thalassemia carrier registry & couple alerts
- Drone dispatch & delivery tracking
- Payment transactions & audit logs
- Trust scoring & suspicious activity

📂 **Full SQL schema + ERD:** [Google Drive](https://drive.google.com/drive/folders/1OM94Mz9uwFE8f7fnakHWRFNWuueSgpZF?usp=drive_link)

---

## 🔒 Security

- Session-based authentication with role verification on every request
- SQL injection prevention via prepared statements
- XSS prevention via `htmlspecialchars()`
- CSRF protection on all POST endpoints
- SSLCommerz payment via HTTPS only
- Google OAuth 2.0 + GitHub OAuth for social login
- Soft deletion (status flags) preserves audit history

---

## ⚠️ Known Limitations

- Drone delivery is **simulated** — no real hardware integration
- Voice requests use basic browser speech recognition (no trained NLP)
- Raktosathi AI chatbot uses **Groq API client-side** (InfinityFree cURL workaround)
- Cold chain sensor data is mocked, not sourced from real IoT devices
- Emergency broadcasts are in-app only — no SMS gateway
- UI is primarily English; Bangla is partially scaffolded
- Currently runs on localhost / shared hosting — no cloud/CI-CD deployment

---

## 🌐 Supported Roles

| Role | Access |
|---|---|
| `donor_recipient` | Donate blood, request blood, track donations |
| `blood_bank` | Manage inventory, process requests, dispatch |
| `lab_technician` | Run tests, approve bags, manage quarantine |
| `doctor` | Approve requests, manage patients, screen thalassemia |
| `hospital` | Request blood, respond to emergencies |
| `medical_college` | Same as hospital + demand analytics |
| `delivery_staff` | Accept tasks, confirm pickup/delivery |
| `admin` | Full system access |

---

## 🔭 Future Work

- Native Android/iOS app with push notifications and biometric login
- SMS alerts via SSL Wireless Bangladesh for emergency broadcasts
- Live AI chatbot replacing Raktosathi with bilingual Bangla/English LLM
- IoT cold chain sensors (Arduino/Raspberry Pi)
- National ID verification via Bangladesh NID database
- ML demand forecasting (LSTM/Prophet) for blood shortage prediction by division
- Blockchain traceability ledger for end-to-end blood bag audit
- Cloud deployment on AWS/Azure with Docker and auto-scaling

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 👥 Team

**UIU Team Alpha Trinity**  
Department of Computer Science and Engineering  
United International University (UIU), Dhaka, Bangladesh  
Course: CSE 3522 — Database Management System Laboratory

---

## 📞 Contact

- **GitHub:** [@kanik-deb194](https://github.com/kanik-deb194)
- **University:** United International University, Dhaka

---

<div align="center">
  <strong>Built with ❤️ to save lives in Bangladesh</strong><br>
  <em>BloodBridge — Connecting donors, recipients, and blood banks in real-time</em>
</div>
