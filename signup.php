<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';
require_once 'mail_config.php';

if ($conn->connect_error) {
    sendJson(false, 'Database connection failed: ' . $conn->connect_error);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(false, 'Invalid request method.');
}
function getPost($key)
{
    return trim($_POST[$key] ?? '');
}

$accountType = getPost('account_type');

// ------------------------------------------------------------------
// BLOOD BANK / HOSPITAL / MEDICAL COLLEGE
// ------------------------------------------------------------------
if ($accountType === 'bloodbank') {
    $name       = getPost('bank_name');
    $regNo      = getPost('registration_no');
    $email      = getPost('bank_email');
    $phone      = getPost('bank_phone');
    $password   = getPost('bank_password');
    $confirmPw  = getPost('bank_confirm_password');
    $role       = getPost('institution_type');
    $address    = getPost('address');
    $city       = getPost('city');
    $state      = getPost('state');
    $postalCode = getPost('postal_code');
    $country    = getPost('country');

    if (empty($name) || empty($regNo) || empty($email) || empty($phone) || empty($password)) {
        sendJson(false, 'Please fill all required fields.');
    }
    $emailCheck = validateEmail($email);
    if (!$emailCheck['valid']) {
        sendJson(false, $emailCheck['message']);
    }
    if ($password !== $confirmPw) {
        sendJson(false, 'Password and confirm password do not match.');
    }
    if (strlen($password) < 8) {
        sendJson(false, 'Password must be at least 8 characters.');
    }
    if (!in_array($role, ['blood_bank', 'hospital', 'medical_college'])) {
        sendJson(false, 'Invalid institution type.');
    }

    $check = $conn->prepare("SELECT id FROM blood_bank WHERE email = ? OR registration_no = ?");
    $check->bind_param('ss', $email, $regNo);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        sendJson(false, 'Email or Registration number already exists.', 'login.html', ['email_exists' => true]);
    }
    $check->close();

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare("
        INSERT INTO blood_bank 
        (name, registration_no, email, phone, password_hash, role, address_line, city, state, postal_code, country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param('sssssssssss', $name, $regNo, $email, $phone, $passwordHash, $role, $address, $city, $state, $postalCode, $country);
    if (!$stmt->execute()) {
        sendJson(false, 'Failed to create account: ' . $stmt->error);
    }
    $newId = $conn->insert_id;
    $stmt->close();

    if ($role === 'hospital') {
        $stmt2 = $conn->prepare("INSERT INTO hospital (id, name, registration_no, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt2->bind_param('issssss', $newId, $name, $regNo, $email, $phone, $address, $city);
        $stmt2->execute();
        $stmt2->close();
    } elseif ($role === 'medical_college') {
        $stmt2 = $conn->prepare("INSERT INTO medical_college (id, name, registration_no, email, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt2->bind_param('issssss', $newId, $name, $regNo, $email, $phone, $address, $city);
        $stmt2->execute();
        $stmt2->close();
    }
    sendJson(true, ucfirst($role) . ' account created successfully.', 'login.html');
}

// ------------------------------------------------------------------
// USER REGISTRATION
// ------------------------------------------------------------------
elseif ($accountType === 'user') {
    $fullName = getPost('full_name');
    $email    = getPost('user_email');
    $phone    = getPost('user_phone');
    $password = getPost('user_password');
    $confirmPw = getPost('user_confirm_password');
    $role     = getPost('user_role');

    if (empty($fullName) || empty($email) || empty($phone) || empty($password) || empty($role)) {
        sendJson(false, 'Please fill all required user fields.');
    }
    $emailCheck = validateEmail($email);
    if (!$emailCheck['valid']) {
        sendJson(false, $emailCheck['message']);
    }
    if ($password !== $confirmPw) {
        sendJson(false, 'Password and confirm password do not match.');
    }
    if (strlen($password) < 8) {
        sendJson(false, 'Password must be at least 8 characters.');
    }
    $allowedRoles = ['donor_recipient', 'doctor', 'lab_technician', 'delivery_staff'];
    if (!in_array($role, $allowedRoles, true)) {
        sendJson(false, 'Invalid role selected.');
    }

    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param('s', $email);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        sendJson(false, 'Email already registered.', 'login.html', ['email_exists' => true]);
    }
    $check->close();

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $verifToken = bin2hex(random_bytes(32));
    $tokenExpires = date('Y-m-d H:i:s', time() + 86400); // 24 hours
    $isActive = 0;

    $stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password_hash, role, is_active, verification_token, token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param('sssssiss', $fullName, $email, $phone, $passwordHash, $role, $isActive, $verifToken, $tokenExpires);
    if (!$stmt->execute()) {
        sendJson(false, 'Failed to create user: ' . $stmt->error);
    }
    $userId = $conn->insert_id;
    $stmt->close();

    // ------------------------------------------------------------------
    // Unified Donor & Recipient — insert into donor_recipient table
    // ------------------------------------------------------------------
    if ($role === 'donor_recipient') {
        $bloodGroup = getPost('dr_blood_group');
        $dob        = getPost('dr_dob');
        $gender     = getPost('dr_gender');
        $weight     = getPost('dr_weight');
        $height     = getPost('dr_height');
        $emergency  = getPost('dr_emergency_contact');
        $conditions = getPost('dr_conditions');

        if (empty($bloodGroup) || empty($dob) || empty($gender) || $weight === '' || $height === '' || empty($emergency)) {
            sendJson(false, 'Please fill all Donor & Recipient details.');
        }

        if (calculateAge($dob) < 17) {
            sendJson(false, 'You must be at least 17 years old to register.');
        }

        $stmt = $conn->prepare("
            INSERT INTO donor_recipient 
            (user_id, blood_group, date_of_birth, gender, weight_kg, height_cm, 
             emergency_contact, underlying_conditions, total_donations)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        ");
        $stmt->bind_param('isssddss', $userId, $bloodGroup, $dob, $gender, $weight, $height, $emergency, $conditions);
        if (!$stmt->execute()) {
            sendJson(false, 'Failed to save donor & recipient details: ' . $stmt->error);
        }
        $stmt->close();
    } elseif ($role === 'doctor') {
        $specialization = getPost('doctor_specialization');
        $license        = getPost('doctor_license');
        $hospital       = getPost('doctor_hospital');
        $stmt = $conn->prepare("INSERT INTO doctor (user_id, specialization, license_no, hospital_affiliation) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('isss', $userId, $specialization, $license, $hospital);
        if (!$stmt->execute()) sendJson(false, 'Failed to save doctor details: ' . $stmt->error);
        $stmt->close();
    } elseif ($role === 'lab_technician') {
        $certification = getPost('lab_certification');
        $labName       = getPost('lab_name');
        $stmt = $conn->prepare("INSERT INTO lab_technician (user_id, certification, lab_name) VALUES (?, ?, ?)");
        $stmt->bind_param('iss', $userId, $certification, $labName);
        if (!$stmt->execute()) sendJson(false, 'Failed to save lab details: ' . $stmt->error);
        $stmt->close();
    } elseif ($role === 'delivery_staff') {
        $vehicle = getPost('delivery_vehicle');
        $license = getPost('delivery_license');
        $zone    = getPost('delivery_zone');
        $stmt = $conn->prepare("INSERT INTO delivery_staff (user_id, vehicle_type, license_no, assigned_zone) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('isss', $userId, $vehicle, $license, $zone);
        if (!$stmt->execute()) sendJson(false, 'Failed to save delivery details: ' . $stmt->error);
        $stmt->close();
    }

    // ── Send verification email ──
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $basePath = dirname($_SERVER['SCRIPT_NAME']);
    $verifLink = "{$protocol}://{$_SERVER['HTTP_HOST']}{$basePath}/verify_email.php?token={$verifToken}";
    $subject = 'Verify your BloodBridge account';
    $htmlBody = '
    <div style="max-width:560px;margin:0 auto;font-family:\'Outfit\',Arial,sans-serif;background:#0e0a0b;border-radius:20px;overflow:hidden;border:1px solid rgba(192,22,44,0.2);">
      <div style="background:linear-gradient(135deg,#C0162C,#8B0020);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.03em;">Blood<span style="color:#f5a0a8;">Bridge</span></h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Verify your email address</p>
      </div>
      <div style="padding:32px 30px;color:#F5F0EE;">
        <p style="font-size:15px;margin:0 0 16px;">Hi <strong>' . htmlspecialchars($fullName) . '</strong>,</p>
        <p style="font-size:14px;color:rgba(245,240,238,0.7);margin:0 0 20px;line-height:1.7;">
          Thank you for joining BloodBridge! Please verify your email address by clicking the button below. This link expires in <strong>24 hours</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="' . $verifLink . '" style="display:inline-block;padding:14px 36px;border-radius:50px;background:linear-gradient(135deg,#C0162C,#8B0020);color:#fff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 6px 24px rgba(192,22,44,0.4);">Verify My Email</a>
        </div>
        <p style="font-size:13px;color:rgba(245,240,238,0.5);margin:20px 0 0;line-height:1.6;">
          If the button doesn\'t work, copy and paste this link into your browser:<br>
          <span style="color:rgba(245,240,238,0.4);word-break:break-all;font-size:12px;">' . $verifLink . '</span>
        </p>
      </div>
      <div style="border-top:1px solid rgba(192,22,44,0.15);padding:18px 30px;text-align:center;">
        <p style="font-size:12px;color:rgba(245,240,238,0.35);margin:0;">🇧🇩 BloodBridge Bangladesh — Saving lives, one drop at a time.</p>
      </div>
    </div>';
    sendMail($email, $subject, $htmlBody);

    sendJson(true, 'Verification email sent! Please check your inbox.', 'verify_sent.html?email=' . urlencode($email));
} else {
    sendJson(false, 'Invalid account type.');
}
$conn->close();
