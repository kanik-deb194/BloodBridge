<?php
session_start();
require_once 'config.php';

$oauthName  = $_SESSION['oauth_name']  ?? '';
$oauthEmail = $_SESSION['oauth_email'] ?? '';
$oauthPicture = $_SESSION['oauth_picture'] ?? '';
$oauthProvider = $_SESSION['oauth_provider'] ?? '';
$oauthExists = $_SESSION['oauth_exists'] ?? '';

if (empty($oauthEmail)) {
    header('Location: login.html');
    exit;
}

// ── If user already exists, look them up ──
$existingAccount = null;
if ($oauthExists === 'yes') {
    $stmt = $conn->prepare("SELECT id, email, full_name, role, is_active, 'user' as account_type FROM users WHERE email = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param("s", $oauthEmail);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) {
            $existingAccount = $res->fetch_assoc();
        }
        $stmt->close();
    }
    if (!$existingAccount) {
        $stmt = $conn->prepare("SELECT id, email, name as full_name, role, status, 'blood_bank' as account_type FROM blood_bank WHERE email = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param("s", $oauthEmail);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res && $res->num_rows > 0) {
                $existingAccount = $res->fetch_assoc();
            }
            $stmt->close();
        }
    }
}

// ── Handle form submission ──
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');

    if ($conn->connect_error) sendJson(false, 'Database connection failed.');

    // ── Existing user continuing ──
    $action = trim($_POST['oauth_action'] ?? '');
    if ($action === 'continue') {
        if (!$existingAccount) sendJson(false, 'Account not found. Please try again.');
        $userData = $existingAccount;
        $accountType = $userData['account_type'];

        session_regenerate_id(true);
        $_SESSION['user_id'] = $userData['id'];
        $_SESSION['user_name'] = $userData['full_name'];
        $_SESSION['user_email'] = $userData['email'];
        $_SESSION['role'] = $accountType;
        $_SESSION['sub_role'] = $userData['role'] ?? '';
        $_SESSION['login_time'] = time();
        unset($_SESSION['oauth_name'], $_SESSION['oauth_email'], $_SESSION['oauth_picture'], $_SESSION['oauth_provider'], $_SESSION['oauth_exists']);

        $subRole = $userData['role'] ?? '';
        if ($accountType === 'blood_bank') {
            $map = ['blood_bank' => 'bankdash.html', 'hospital' => 'hospital_dash.html', 'medical_college' => 'medical_college_dash.html'];
            sendJson(true, 'Welcome back! Redirecting...', $map[$subRole] ?? 'bankdash.html');
        } else {
            $map = ['donor_recipient' => 'donor_recipient_dash.html', 'doctor' => 'doctor_dash.html', 'lab_technician' => 'lab_technician_dash.html', 'delivery_staff' => 'delivery_staff_dash.html'];
            sendJson(true, 'Welcome back! Redirecting...', $map[$subRole] ?? 'donor_recipient_dash.html');
        }
    }

    $accountType = trim($_POST['account_type'] ?? '');
    $fullName    = trim($_POST['full_name'] ?? $oauthName);
    $email       = trim($_POST['user_email'] ?? $oauthEmail);
    $emailCheck  = validateEmail($email);
    if (!$emailCheck['valid']) {
        sendJson(false, $emailCheck['message']);
    }

    if ($accountType === 'bloodbank') {
        $name       = trim($_POST['bank_name'] ?? $fullName);
        $regNo      = trim($_POST['registration_no'] ?? '');
        $phone      = trim($_POST['bank_phone'] ?? '');
        $role       = trim($_POST['institution_type'] ?? '');
        $address    = trim($_POST['address'] ?? '');
        $city       = trim($_POST['city'] ?? '');
        $state      = trim($_POST['state'] ?? '');
        $postalCode = trim($_POST['postal_code'] ?? '');
        $country    = trim($_POST['country'] ?? '');

        if (empty($name) || empty($regNo) || empty($phone)) sendJson(false, 'Please fill all required fields.');
        if (!in_array($role, ['blood_bank','hospital','medical_college'])) sendJson(false, 'Invalid institution type.');

        $check = $conn->prepare("SELECT id FROM blood_bank WHERE email = ? OR registration_no = ?");
        $check->bind_param('ss', $email, $regNo);
        $check->execute();
        $check->store_result();
        if ($check->num_rows > 0) sendJson(false, 'Email or Registration number already exists.', 'login.html', ['email_exists' => true]);
        $check->close();

        $randomPw = bin2hex(random_bytes(16));
        $passwordHash = password_hash($randomPw, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("INSERT INTO blood_bank (name, registration_no, email, phone, password_hash, role, address_line, city, state, postal_code, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('sssssssssss', $name, $regNo, $email, $phone, $passwordHash, $role, $address, $city, $state, $postalCode, $country);
        if (!$stmt->execute()) sendJson(false, 'Failed to create account: ' . $stmt->error);
        $newId = $conn->insert_id;
        $stmt->close();

        if ($role === 'hospital') {
            $stmt2 = $conn->prepare("INSERT INTO hospital (id, name, registration_no, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt2->bind_param('issssss', $newId, $name, $regNo, $email, $phone, $address, $city);
            $stmt2->execute(); $stmt2->close();
        } elseif ($role === 'medical_college') {
            $stmt2 = $conn->prepare("INSERT INTO medical_college (id, name, registration_no, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt2->bind_param('issssss', $newId, $name, $regNo, $email, $phone, $address, $city);
            $stmt2->execute(); $stmt2->close();
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $newId;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_email'] = $email;
        $_SESSION['role'] = 'blood_bank';
        $_SESSION['sub_role'] = $role;
        $_SESSION['login_time'] = time();
        unset($_SESSION['oauth_name'], $_SESSION['oauth_email'], $_SESSION['oauth_picture'], $_SESSION['oauth_provider']);

        $dashMap = ['blood_bank' => 'bankdash.html', 'hospital' => 'hospital_dash.html', 'medical_college' => 'medical_college_dash.html'];
        sendJson(true, 'Account created successfully!', $dashMap[$role] ?? 'bankdash.html');
    } else {
        $phone  = trim($_POST['user_phone'] ?? '');
        $role   = trim($_POST['user_role'] ?? '');
        if (empty($fullName) || empty($phone) || empty($role)) sendJson(false, 'Please fill all required fields.');
        $allowedRoles = ['donor_recipient','doctor','lab_technician','delivery_staff'];
        if (!in_array($role, $allowedRoles, true)) sendJson(false, 'Invalid role selected.');

        $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $check->bind_param('s', $email);
        $check->execute();
        $check->store_result();
        if ($check->num_rows > 0) sendJson(false, 'Email already registered.', 'login.html', ['email_exists' => true]);
        $check->close();

        $randomPw = bin2hex(random_bytes(16));
        $passwordHash = password_hash($randomPw, PASSWORD_BCRYPT);
        $stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt->bind_param('sssss', $fullName, $email, $phone, $passwordHash, $role);
        if (!$stmt->execute()) sendJson(false, 'Failed to create user: ' . $stmt->error);
        $userId = $conn->insert_id;
        $stmt->close();

        if ($role === 'donor_recipient') {
            $bloodGroup = trim($_POST['dr_blood_group'] ?? '');
            $dob        = trim($_POST['dr_dob'] ?? '');
            $gender     = trim($_POST['dr_gender'] ?? '');
            $weight     = trim($_POST['dr_weight'] ?? '');
            $height     = trim($_POST['dr_height'] ?? '');
            $emergency  = trim($_POST['dr_emergency_contact'] ?? '');
            $conditions = trim($_POST['dr_conditions'] ?? '');
            if (empty($bloodGroup) || empty($dob) || empty($gender) || $weight === '' || $height === '' || empty($emergency)) sendJson(false, 'Please fill all Donor & Recipient details.');
            if (calculateAge($dob) < 17) sendJson(false, 'You must be at least 17 years old to register.');
            $stmt = $conn->prepare("INSERT INTO donor_recipient (user_id, blood_group, date_of_birth, gender, weight_kg, height_cm, emergency_contact, underlying_conditions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param('isssddss', $userId, $bloodGroup, $dob, $gender, $weight, $height, $emergency, $conditions);
            if (!$stmt->execute()) sendJson(false, 'Failed to save donor details: ' . $stmt->error);
            $stmt->close();
        } elseif ($role === 'doctor') {
            $spec  = trim($_POST['doctor_specialization'] ?? '');
            $lic   = trim($_POST['doctor_license'] ?? '');
            $hosp  = trim($_POST['doctor_hospital'] ?? '');
            $stmt = $conn->prepare("INSERT INTO doctor (user_id, specialization, license_no, hospital_affiliation) VALUES (?, ?, ?, ?)");
            $stmt->bind_param('isss', $userId, $spec, $lic, $hosp);
            if (!$stmt->execute()) sendJson(false, 'Failed to save doctor details.');
            $stmt->close();
        } elseif ($role === 'lab_technician') {
            $cert = trim($_POST['lab_certification'] ?? '');
            $lab  = trim($_POST['lab_name'] ?? '');
            $stmt = $conn->prepare("INSERT INTO lab_technician (user_id, certification, lab_name) VALUES (?, ?, ?)");
            $stmt->bind_param('iss', $userId, $cert, $lab);
            if (!$stmt->execute()) sendJson(false, 'Failed to save lab details.');
            $stmt->close();
        } elseif ($role === 'delivery_staff') {
            $vehicle = trim($_POST['delivery_vehicle'] ?? '');
            $lic     = trim($_POST['delivery_license'] ?? '');
            $zone    = trim($_POST['delivery_zone'] ?? '');
            $stmt = $conn->prepare("INSERT INTO delivery_staff (user_id, vehicle_type, license_no, assigned_zone) VALUES (?, ?, ?, ?)");
            $stmt->bind_param('isss', $userId, $vehicle, $lic, $zone);
            if (!$stmt->execute()) sendJson(false, 'Failed to save delivery details.');
            $stmt->close();
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_name'] = $fullName;
        $_SESSION['user_email'] = $email;
        $_SESSION['role'] = 'user';
        $_SESSION['sub_role'] = $role;
        $_SESSION['login_time'] = time();
        unset($_SESSION['oauth_name'], $_SESSION['oauth_email'], $_SESSION['oauth_picture'], $_SESSION['oauth_provider']);

        $dashMap = ['donor_recipient' => 'donor_recipient_dash.html', 'doctor' => 'doctor_dash.html', 'lab_technician' => 'lab_technician_dash.html', 'delivery_staff' => 'delivery_staff_dash.html'];
        sendJson(true, 'Account created successfully!', $dashMap[$role] ?? 'donor_recipient_dash.html');
    }
}
?>
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BloodBridge — Complete Registration</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="signup.css" />
  <style>
    .field-input:disabled, .field-input[readonly] {
      opacity: 0.7; cursor: not-allowed; background: rgba(255,255,255,0.03);
    }
    .oauth-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 40px;
      font-size: 0.7rem; font-weight: 600;
    }
    .oauth-badge.google { 
      background: rgba(234,67,53,0.12); color: #ea4335;
      border: 1px solid rgba(234,67,53,0.2); 
    }
    .oauth-badge.github { 
      background: rgba(36,41,46,0.12); color: #ffffff;
      border: 1px solid rgba(255,255,255,0.2); 
    }
    body.light-theme .oauth-badge.github {
      background: rgba(36,41,46,0.1); color: #24292e;
      border: 1px solid rgba(36,41,46,0.2);
    }
    .oauth-header {
      display: flex; align-items: center; gap: 16px;
      padding: 16px 20px; margin-bottom: 16px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-radius: 14px;
    }
    .oauth-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      object-fit: cover; border: 2px solid var(--accent-color, #ea4335);
    }
    .oauth-avatar-placeholder {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(234,67,53,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; color: var(--accent-color, #ea4335);
      border: 2px solid var(--accent-color, #ea4335);
    }
    <?php if ($oauthProvider === 'github'): ?>
    :root { --accent-color: #24292e; }
    body.light-theme { --accent-color: #24292e; }
    <?php else: ?>
    :root { --accent-color: #ea4335; }
    <?php endif; ?>
    .oauth-info h3 { margin: 0 0 2px; font-size: 0.95rem; }
    .oauth-info p { margin: 0; font-size: 0.78rem; color: var(--text-muted); }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
<div class="bg-scene"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
<div class="grid-overlay"></div>

<nav>
  <div class="nav-logo"><span class="logo-icon">🩸</span><span class="logo-text">BloodBridge</span></div>
  <div class="nav-right">
    <div class="theme-toggle" id="themeToggle" title="Toggle theme">
      <div class="toggle-track">
        <span class="toggle-icon moon">🌙</span>
        <span class="toggle-icon sun">☀️</span>
        <div class="toggle-thumb"></div>
      </div>
    </div>
    <a href="login.html" class="nav-link-btn">Login</a>
    <a href="landing_page.html" class="nav-cta">Home</a>
  </div>
</nav>

<main class="signup-main">
  <div class="signup-container">
    <div class="signup-left">
      <div class="left-content">
        <div class="left-badge"><span class="dot"></span> Almost there!</div>
        <h1 class="left-title">One Last<br /><em>Step</em> to Join<br />the Mission</h1>
        <p class="left-sub">Your <?= htmlspecialchars(ucfirst($oauthProvider)) ?> account is verified. Just tell us a little more about yourself so we can set up your Blood Bridge profile.</p>
        <div class="left-stats">
          <div class="left-stat"><div class="left-stat-num">4,821</div><div class="left-stat-label">Registered Donors</div></div>
          <div class="left-stat-divider"></div>
          <div class="left-stat"><div class="left-stat-num">218</div><div class="left-stat-label">Blood Banks</div></div>
          <div class="left-stat-divider"></div>
          <div class="left-stat"><div class="left-stat-num">1,340</div><div class="left-stat-label">Lives Saved</div></div>
        </div>
        <div class="left-tags">
          <span class="tag">🔐 Verified &amp; Secure</span>
          <span class="tag">⚡ Auto Login</span>
          <span class="tag">🩸 Zero Paperwork</span>
        </div>
      </div>
    </div>

    <div class="signup-right">
      <div class="form-card glass-card">
        <div class="form-header">
          <h2 class="form-title">Welcome back, <?= htmlspecialchars(explode(' ', $oauthName)[0]) ?>!</h2>
          <p class="form-sub">We've verified your identity via <strong><?= htmlspecialchars(ucfirst($oauthProvider)) ?></strong>. Please complete the remaining details to set up your portal access.</p>
        </div>

        <div class="oauth-header" style="animation: slideIn 0.5s ease both;">
          <?php if ($oauthPicture): ?>
            <img src="<?= htmlspecialchars($oauthPicture) ?>" alt="" class="oauth-avatar" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.style.display='none';document.getElementById('avatarPfb').style.display='flex'" />
            <div id="avatarPfb" class="oauth-avatar-placeholder" style="display:none">👤</div>
          <?php else: ?>
            <div id="avatarPfb" class="oauth-avatar-placeholder">👤</div>
          <?php endif; ?>
          <div class="oauth-info">
            <h3 style="display: flex; align-items: center; gap: 8px;">
              <?= htmlspecialchars($oauthName ?: 'User') ?>
              <span title="Verified Identity" style="color: #4ade80; font-size: 0.9rem;">Verified ✅</span>
            </h3>
            <p><span class="oauth-badge <?= htmlspecialchars($oauthProvider) ?>">🔗 <?= htmlspecialchars($oauthEmail) ?></span></p>
          </div>
        </div>

        <form id="oauthForm" method="POST" novalidate>

<?php if ($existingAccount): ?>
  <!-- ===== EXISTING USER - CONTINUE FLOW ===== -->
  <input type="hidden" name="oauth_action" value="continue" />
  <input type="hidden" name="user_email" value="<?= htmlspecialchars($oauthEmail) ?>" />
  <input type="hidden" name="full_name" value="<?= htmlspecialchars($existingAccount['full_name']) ?>" />

  <div style="text-align:center;padding:10px 0 20px;">
    <div style="font-size:3rem;margin-bottom:12px;">👋</div>
    <h3 style="font-size:1.3rem;margin-bottom:6px;">Welcome back!</h3>
    <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:20px;">
      We found an existing account linked to <strong><?= htmlspecialchars($oauthEmail) ?></strong>.<br />
      Click below to continue to your dashboard.
    </p>
    <button type="submit" class="btn-submit" id="submitBtn" style="max-width:280px;margin:0 auto;">
      <span class="btn-submit-text">Continue as <?= htmlspecialchars($existingAccount['full_name']) ?> →</span>
      <span class="btn-loader" style="display:none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>
    </button>
    <div class="error-msg" id="errorMsg" style="display:none;margin-top:14px;"></div>
    <div class="success-msg" id="successMsg" style="display:none;margin-top:14px;"><span>✅</span> Redirecting...</div>
    <div class="diff-account-divider"></div>
    <div class="diff-account">
      Not <?= htmlspecialchars($existingAccount['full_name']) ?>?
      <a href="logout.php" class="diff-account-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
        Use a different account
      </a>
    </div>
  </div>

<?php else: ?>
  <!-- ===== NEW USER - FULL REGISTRATION FORM ===== -->
          <input type="hidden" id="accountType" name="account_type" value="user" />

          <div class="type-selector" id="typeSelector">
            <button type="button" class="type-btn active" data-type="user" id="btnUser"><span class="type-btn-icon">👤</span><span class="type-btn-label">Join as Individual</span></button>
            <button type="button" class="type-btn" data-type="bloodbank" id="btnBank"><span class="type-btn-icon">🏥</span><span class="type-btn-label">Join as Institution</span></button>
          </div>

          <!-- ===== USER FORM ===== -->
          <div class="form-section" id="userForm">
            <div class="section-divider"><span>Personal Profile</span></div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label">Display Name <span class="req">*</span></label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input type="text" id="u_fullname" name="full_name" class="field-input" value="<?= htmlspecialchars($oauthName) ?>" readonly />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label"><?= htmlspecialchars(ucfirst($oauthProvider)) ?> Account <span class="req">*</span></label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <input type="email" id="u_email" name="user_email" class="field-input" value="<?= htmlspecialchars($oauthEmail) ?>" readonly />
                </div>
              </div>
            </div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label" for="u_phone">Mobile Number <span class="req">*</span></label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </span>
                  <input type="tel" id="u_phone" name="user_phone" class="field-input" placeholder="+880 1X-XXXX-XXXX" required />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label" for="u_role">Assign Portal Role <span class="req">*</span></label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <select id="u_role" name="user_role" class="field-select" required>
                    <option value="" disabled selected>Select your professional role</option>
                    <option value="donor_recipient">🩸 Individual (Donor/Recipient)</option>
                    <option value="doctor">👨‍⚕️ Registered Doctor</option>
                    <option value="lab_technician">🔬 Lab Technician</option>
                    <option value="delivery_staff">🚚 Delivery Personnel</option>
                  </select>
                  <span class="select-arrow">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </div>
              </div>
            </div>

            <div id="roleHint" style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 16px; font-style: italic;">
              * You will be redirected to the respective portal based on this selection.
            </div>

            <!-- Donor & Recipient fields -->
            <div class="role-fields glass-inner" id="fields_donor_recipient" style="display:none">
              <div class="role-fields-header"><span class="role-badge">🩸 Medical Profile</span></div>
              <div class="form-row two-col">
                <div class="field-group">
                  <label class="field-label" for="dr_blood">Blood Group <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="input-icon">💉</span>
                    <select id="dr_blood" name="dr_blood_group" class="field-select">
                      <option value="" disabled selected>Select blood group</option>
                      <option>A+</option><option>A−</option><option>B+</option><option>B−</option>
                      <option>O+</option><option>O−</option><option>AB+</option><option>AB−</option>
                    </select>
                    <span class="select-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="dr_dob">Date of Birth <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">📅</span><input type="date" id="dr_dob" name="dr_dob" class="field-input" /><span class="field-status" id="dr_dobStatus"></span></div>
                  <div class="field-error" id="dr_dobError"></div>
                </div>
              </div>
              <div class="form-row three-col">
                <div class="field-group">
                  <label class="field-label" for="dr_gender">Gender <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="input-icon">⚧</span>
                    <select id="dr_gender" name="dr_gender" class="field-select">
                      <option value="" disabled selected>Select</option>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                    <span class="select-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="dr_weight">Weight (kg) <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">⚖️</span><input type="number" id="dr_weight" name="dr_weight" class="field-input" placeholder="e.g. 65" min="40" max="200" /></div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="dr_height">Height (cm) <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">📏</span><input type="number" id="dr_height" name="dr_height" class="field-input" placeholder="e.g. 170" min="100" max="250" /></div>
                </div>
              </div>
              <div class="form-row two-col">
                <div class="field-group">
                  <label class="field-label" for="dr_emergency">Emergency Contact <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="input-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
                    <input type="tel" id="dr_emergency" name="dr_emergency_contact" class="field-input" placeholder="+880 1X-XXXX-XXXX" />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="dr_conditions">Underlying Conditions</label>
                  <div class="input-wrap textarea-wrap">
                    <textarea id="dr_conditions" name="dr_conditions" class="field-textarea" placeholder="e.g. Thalassemia, Sickle cell…" rows="2"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- Doctor fields -->
            <div class="role-fields glass-inner" id="fields_doctor" style="display:none">
              <div class="role-fields-header"><span class="role-badge">👨‍⚕️ Professional Credentials</span></div>
              <div class="form-row two-col">
                <div class="field-group">
                  <label class="field-label" for="doc_spec">Specialization <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">🩺</span><input type="text" id="doc_spec" name="doctor_specialization" class="field-input" placeholder="e.g. Haematology" /></div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="doc_license">License No. <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">📋</span><input type="text" id="doc_license" name="doctor_license" class="field-input" placeholder="BMDC-XXXXX" /></div>
                </div>
              </div>
              <div class="field-group">
                <label class="field-label" for="doc_hospital">Hospital Affiliation <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">🏥</span><input type="text" id="doc_hospital" name="doctor_hospital" class="field-input" placeholder="e.g. Dhaka Medical College Hospital" /></div>
              </div>
            </div>

            <!-- Lab Technician fields -->
            <div class="role-fields glass-inner" id="fields_lab_technician" style="display:none">
              <div class="role-fields-header"><span class="role-badge">🔬 Laboratory Info</span></div>
              <div class="form-row two-col">
                <div class="field-group">
                  <label class="field-label" for="lab_cert">Certification <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">🎓</span><input type="text" id="lab_cert" name="lab_certification" class="field-input" placeholder="e.g. BMLT, DLT" /></div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="lab_name">Lab Name <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">🏢</span><input type="text" id="lab_name" name="lab_name" class="field-input" placeholder="e.g. Popular Diagnostic" /></div>
                </div>
              </div>
            </div>

            <!-- Delivery Staff fields -->
            <div class="role-fields glass-inner" id="fields_delivery_staff" style="display:none">
              <div class="role-fields-header"><span class="role-badge">🚚 Logistics Details</span></div>
              <div class="form-row two-col">
                <div class="field-group">
                  <label class="field-label" for="ds_vehicle">Vehicle Type <span class="req">*</span></label>
                  <div class="input-wrap">
                    <span class="input-icon">🚗</span>
                    <select id="ds_vehicle" name="delivery_vehicle" class="field-select">
                      <option value="" disabled selected>Select</option>
                      <option>Motorcycle</option><option>Car</option><option>Van</option><option>Ambulance</option><option>Bicycle</option>
                    </select>
                    <span class="select-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label" for="ds_license">License No. <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">📋</span><input type="text" id="ds_license" name="delivery_license" class="field-input" placeholder="BRTA-XXXXX" /></div>
                </div>
              </div>
              <div class="form-row">
                <div class="field-group">
                  <label class="field-label" for="ds_zone">Assigned Zone <span class="req">*</span></label>
                  <div class="input-wrap"><span class="input-icon">📍</span><input type="text" id="ds_zone" name="delivery_zone" class="field-input" placeholder="e.g. Dhaka North" /></div>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== BLOOD BANK FORM ===== -->
          <div class="form-section" id="bloodbankForm" style="display:none">
            <div class="section-divider"><span>Institution Profile</span></div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label" for="b_name">Institution Name <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">🏥</span><input type="text" id="b_name" name="bank_name" class="field-input" placeholder="e.g. Dhaka Central Blood Bank" value="<?= htmlspecialchars($oauthName) ?>" /></div>
              </div>
              <div class="field-group">
                <label class="field-label" for="b_regno">Registration No. <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">📋</span><input type="text" id="b_regno" name="registration_no" class="field-input" placeholder="REG-XXXXX" /></div>
              </div>
            </div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label">Primary Email <span class="req">*</span></label>
                <div class="input-wrap">
                  <span class="input-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span>
                  <input type="email" class="field-input" value="<?= htmlspecialchars($oauthEmail) ?>" readonly />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label" for="b_phone">Contact Phone <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
                <input type="tel" id="b_phone" name="bank_phone" class="field-input" placeholder="+880 2X-XXXX-XXXX" /></div>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label" for="b_role">Institution Type <span class="req">*</span></label>
              <div class="input-wrap">
                <span class="input-icon">🏷️</span>
                <select id="b_role" name="institution_type" class="field-select">
                  <option value="" disabled selected>Select type</option>
                  <option value="blood_bank">🩸 Blood Bank</option>
                  <option value="hospital">🏥 Hospital</option>
                  <option value="medical_college">🎓 Medical College</option>
                </select>
                <span class="select-arrow"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>
              </div>
            </div>
            <div class="section-divider"><span>Location Details</span></div>
            <div class="field-group">
              <label class="field-label" for="b_address">Address <span class="req">*</span></label>
              <div class="input-wrap"><span class="input-icon">📍</span><input type="text" id="b_address" name="address" class="field-input" placeholder="Street address" /></div>
            </div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label" for="b_city">City <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">🏙️</span><input type="text" id="b_city" name="city" class="field-input" placeholder="e.g. Dhaka" /></div>
              </div>
              <div class="field-group">
                <label class="field-label" for="b_state">State / Division <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">🗺️</span><input type="text" id="b_state" name="state" class="field-input" placeholder="e.g. Dhaka Division" /></div>
              </div>
            </div>
            <div class="form-row two-col">
              <div class="field-group">
                <label class="field-label" for="b_postal">Postal Code <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">📮</span><input type="text" id="b_postal" name="postal_code" class="field-input" placeholder="e.g. 1000" /></div>
              </div>
              <div class="field-group">
                <label class="field-label" for="b_country">Country <span class="req">*</span></label>
                <div class="input-wrap"><span class="input-icon">🌍</span><input type="text" id="b_country" name="country" class="field-input" placeholder="e.g. Bangladesh" /></div>
              </div>
            </div>
          </div>

          <div class="form-bottom">
            <label class="checkbox-label">
              <input type="checkbox" id="agreeTerms" class="checkbox-input" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">I agree to the <a href="terms.php" class="form-link">Terms of Service</a> and <a href="privacy.php" class="form-link">Privacy Policy</a></span>
              <span class="check-hint">Please agree to the terms to continue</span>
            </label>
            <button type="submit" class="btn-submit" id="submitBtn">
              <span class="btn-submit-text">Complete Registration</span>
              <span class="btn-submit-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
              <span class="btn-loader" style="display:none"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>
            </button>
            <div class="success-msg" id="successMsg" style="display:none"><span>✅</span> Account created successfully! Redirecting…</div>
            <div class="error-msg" id="errorMsg" style="display:none"></div>
          </div>
<?php endif; ?>
        </form>
      </div>
    </div>
  </div>
</main>

<script>
(function() {
  'use strict';

  // ── Theme toggle ──
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const saved = localStorage.getItem('bloodbridge_theme') || 'dark';
    if (saved === 'light') document.body.classList.add('light-theme');
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      localStorage.setItem('bloodbridge_theme', isLight ? 'light' : 'dark');
    });
  }

  // ── Account type toggle ──
  const typeBtns = document.querySelectorAll('.type-btn');
  const userForm = document.getElementById('userForm');
  const bankForm = document.getElementById('bloodbankForm');
  const accountType = document.getElementById('accountType');

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      accountType.value = type;
      userForm.style.display = type === 'user' ? '' : 'none';
      bankForm.style.display = type === 'bloodbank' ? '' : 'none';
    });
  });

  // ── Role-specific fields ──
  const roleSelect = document.getElementById('u_role');
  const fieldContainers = {
    donor_recipient: document.getElementById('fields_donor_recipient'),
    doctor: document.getElementById('fields_doctor'),
    lab_technician: document.getElementById('fields_lab_technician'),
    delivery_staff: document.getElementById('fields_delivery_staff')
  };

  function showRoleFields(role) {
    Object.keys(fieldContainers).forEach(key => {
      fieldContainers[key].style.display = key === role ? '' : 'none';
    });
  }
  roleSelect?.addEventListener('change', () => showRoleFields(roleSelect.value));

  // ── DOB age validation (donor_recipient) ──
  const dobInput = document.getElementById('dr_dob');
  if (dobInput) {
    function validateDob() {
      const val = dobInput.value;
      const err = document.getElementById('dr_dobError');
      const status = document.getElementById('dr_dobStatus');
      if (!val) {
        if (err) { err.className = 'field-error'; err.textContent = ''; }
        if (status) { status.className = 'field-status'; status.textContent = ''; }
        return;
      }
      const birth = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 17) {
        if (status) { status.className = 'field-status show invalid'; status.textContent = '✗'; }
        if (err) { err.className = 'field-error show'; err.textContent = 'You must be at least 17 years old.'; }
      } else {
        if (status) { status.className = 'field-status show valid'; status.textContent = '✓'; }
        if (err) { err.className = 'field-error'; err.textContent = ''; }
      }
    }
    dobInput.addEventListener('input', validateDob);
    dobInput.addEventListener('blur', validateDob);
  }

  // ── Email exists overlay ──
  function showOauthEmailExists(msg) {
    const existing = document.getElementById('emailExistsOverlay');
    if (existing) existing.remove();
    const isLight = document.body.classList.contains('light-theme');
    const cardBg = isLight ? 'rgba(250,247,248,0.97)' : 'rgba(14,10,11,0.95)';
    const cardBorder = isLight ? 'rgba(192,22,44,0.12)' : 'rgba(192,22,44,0.2)';
    const textColor = isLight ? 'rgba(30,10,15,0.6)' : 'rgba(245,240,238,0.6)';
    const mutedColor = isLight ? 'rgba(30,10,15,0.35)' : 'rgba(245,240,238,0.35)';
    const overlay = document.createElement('div');
    overlay.id = 'emailExistsOverlay';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);animation:fadeIn 0.35s ease both;">
        <div style="max-width:420px;width:90%;padding:40px 32px;border-radius:20px;background:${cardBg};border:1px solid ${cardBorder};text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.5);animation:scaleIn 0.35s ease both;">
          <div style="width:64px;height:64px;border-radius:50%;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">ℹ️</div>
          <h3 style="margin:0 0 8px;font-size:1.15rem;font-weight:700;color:#facc15;">Account Already Exists</h3>
          <p style="margin:0 0 18px;font-size:0.88rem;color:${textColor};line-height:1.6;">${msg}</p>
          <p style="margin:0 0 6px;font-size:0.78rem;color:${mutedColor};">Redirecting to login<span id="eeDots">.</span></p>
        </div>
      </div>
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}</style>
    `;
    document.body.appendChild(overlay);
    let dots = 0;
    setInterval(() => { dots = (dots % 3) + 1; const el = document.getElementById('eeDots'); if (el) el.textContent = '.'.repeat(dots); }, 400);
  }

  // ── Form submission ──
  const form = document.getElementById('oauthForm');
  const submitBtn = document.getElementById('submitBtn');
  const successMsg = document.getElementById('successMsg');
  const errorMsg = document.getElementById('errorMsg');
  const agreeTerms = document.getElementById('agreeTerms');

  // ── Disable submit until terms agreed (new user only) ──
  if (agreeTerms && submitBtn) {
    submitBtn.disabled = true;
    agreeTerms.addEventListener('change', function() {
      submitBtn.disabled = !this.checked;
      this.closest('.checkbox-label')?.querySelector('.check-hint')?.classList.remove('show');
    });
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const isContinue = document.querySelector('input[name="oauth_action"][value="continue"]') !== null;
    if (!isContinue && agreeTerms && !agreeTerms.checked) {
      const label = agreeTerms.closest('.checkbox-label');
      label.classList.add('shake');
      label.querySelector('.check-hint')?.classList.add('show');
      setTimeout(() => label.classList.remove('shake'), 500);
      return;
    }

    // ── Age check (donor_recipient only) ──
    if (!isContinue) {
      const selRole = document.querySelector('input[name="role"]:checked');
      if (selRole && selRole.value === 'donor_recipient') {
        const dob = document.getElementById('dr_dob')?.value;
        if (!dob) {
          errorMsg.textContent = 'Please enter your date of birth.';
          errorMsg.style.display = '';
          document.getElementById('dr_dob')?.focus();
          submitBtn.disabled = false;
          return;
        }
        const birth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        if (age < 17) {
          errorMsg.textContent = 'You must be at least 17 years old to register.';
          errorMsg.style.display = '';
          document.getElementById('dr_dob')?.focus();
          submitBtn.disabled = false;
          return;
        }
      }
    }

    const btnText = submitBtn.querySelector('.btn-submit-text');
    const btnIcon = submitBtn.querySelector('.btn-submit-icon');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    const originalText = btnText.textContent;

    submitBtn.disabled = true;
    btnText.textContent = isContinue ? 'Signing in...' : 'Creating...';
    if (btnIcon) btnIcon.style.display = 'none';
    if (btnLoader) btnLoader.style.display = '';
    errorMsg.style.display = 'none';

    try {
      const fd = new FormData(form);
      const res = await fetch('oauth_register.php', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        const portalName = data.redirect.replace('_dash.html', '').replace('dash.html', '').replace('.html', '').replace(/_/g, ' ').toUpperCase();
        successMsg.innerHTML = `<span>✅</span> ${isContinue ? 'Welcome back!' : 'Account created!'} Redirecting to <strong>${portalName} Portal</strong>...`;
        successMsg.style.display = '';
        submitBtn.querySelector('.btn-submit-text').textContent = 'Redirecting...';
        setTimeout(() => { window.location.href = data.redirect; }, 1500);
      } else if (data.email_exists) {
        showOauthEmailExists(data.message);
        setTimeout(() => { window.location.href = data.redirect || 'login.html'; }, 3000);
        submitBtn.disabled = false;
        btnText.textContent = originalText;
        if (btnIcon) btnIcon.style.display = '';
        if (btnLoader) btnLoader.style.display = 'none';
      } else {
        errorMsg.textContent = data.message;
        errorMsg.style.display = '';
        submitBtn.disabled = false;
        btnText.textContent = originalText;
        if (btnIcon) btnIcon.style.display = '';
        if (btnLoader) btnLoader.style.display = 'none';
      }
    } catch (err) {
      errorMsg.textContent = 'Network error. Please try again.';
      errorMsg.style.display = '';
      submitBtn.disabled = false;
      btnText.textContent = originalText;
      if (btnIcon) btnIcon.style.display = '';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  });
})();
</script>
</body>
</html>