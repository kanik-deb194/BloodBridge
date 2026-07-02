<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

$token = $_COOKIE['remember_token'] ?? '';

if (empty($token)) {
    echo json_encode(['success' => false]);
    exit;
}

$conn->query("CREATE TABLE IF NOT EXISTS remember_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    account_type ENUM('admin','user','blood_bank') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_email (email)
)");

$stmt = $conn->prepare("SELECT email, account_type FROM remember_tokens WHERE token = ? AND expires_at > NOW() LIMIT 1");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
    setcookie('remember_email', '', ['expires' => time() - 3600, 'path' => '/']);
    echo json_encode(['success' => false]);
    exit;
}

$row = $result->fetch_assoc();
$email = $row['email'];

function findUser($conn, $email) {
    $stmt = $conn->prepare("SELECT id, email, full_name, role, 'active' as status, 'admin' as account_type FROM admin WHERE email = ? LIMIT 1");
    if ($stmt) { $stmt->bind_param("s", $email); $stmt->execute(); $res = $stmt->get_result(); if ($res && $res->num_rows > 0) { $row = $res->fetch_assoc(); $stmt->close(); return $row; } $stmt->close(); }
    $stmt = $conn->prepare("SELECT id, email, name as full_name, role, status, 'blood_bank' as account_type FROM blood_bank WHERE email = ? LIMIT 1");
    if ($stmt) { $stmt->bind_param("s", $email); $stmt->execute(); $res = $stmt->get_result(); if ($res && $res->num_rows > 0) { $row = $res->fetch_assoc(); $stmt->close(); return $row; } $stmt->close(); }
    $stmt = $conn->prepare("SELECT id, email, full_name, role, is_active as status, 'user' as account_type FROM users WHERE email = ? LIMIT 1");
    if ($stmt) { $stmt->bind_param("s", $email); $stmt->execute(); $res = $stmt->get_result(); if ($res && $res->num_rows > 0) { $row = $res->fetch_assoc(); $stmt->close(); return $row; } $stmt->close(); }
    return null;
}

$userData = findUser($conn, $email);
if (!$userData) {
    setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
    echo json_encode(['success' => false]);
    exit;
}

if (strtolower($userData['status'] ?? 'active') !== 'active' && ($userData['status'] ?? 1) != 1) {
    setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Strict']);
    echo json_encode(['success' => false]);
    exit;
}

session_regenerate_id(true);
$_SESSION['user_id'] = $userData['id'];
$_SESSION['user_name'] = $userData['full_name'];
$_SESSION['user_email'] = $userData['email'];
$_SESSION['role'] = $userData['account_type'];
$_SESSION['sub_role'] = $userData['role'] ?? '';
$_SESSION['login_time'] = time();
if ($userData['account_type'] === 'blood_bank') {
    $_SESSION['blood_bank_id'] = $userData['id'];
}

$accountType = $userData['account_type'];
$subRole = $userData['role'] ?? '';
$redirect = 'donor_recipient_dash.html';

if ($accountType === 'admin') {
    $redirect = 'admindash.html';
} elseif ($accountType === 'blood_bank') {
    $map = ['blood_bank' => 'bankdash.html', 'hospital' => 'hospital_dash.html', 'medical_college' => 'medical_college_dash.html'];
    $redirect = $map[$subRole] ?? 'bankdash.html';
} elseif ($accountType === 'user') {
    $map = ['donor_recipient' => 'donor_recipient_dash.html', 'doctor' => 'doctor_dash.html', 'lab_technician' => 'lab_technician_dash.html', 'delivery_staff' => 'delivery_staff_dash.html'];
    $redirect = $map[$subRole] ?? 'donor_recipient_dash.html';
}

echo json_encode(['success' => true, 'redirect' => $redirect, 'name' => $userData['full_name']]);
