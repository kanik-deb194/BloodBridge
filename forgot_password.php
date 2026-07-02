<?php
session_start();
require_once 'config.php';
require_once 'mail_config.php';

header('Content-Type: application/json; charset=utf-8');

function sendJson($success, $message)
{
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(false, 'Invalid request method.');
}

$email = trim($_POST['email'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJson(false, 'Please enter a valid email address.');
}

// Check if email exists in any table
function findEmail($conn, $email)
{
    // Check admin
    $stmt = $conn->prepare("SELECT id, email, full_name FROM admin WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $stmt->close();
        return ['type' => 'admin', 'data' => $row];
    }
    $stmt->close();

    // Check users
    $stmt = $conn->prepare("SELECT id, email, full_name FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $stmt->close();
        return ['type' => 'user', 'data' => $row];
    }
    $stmt->close();

    // Check blood_bank
    $stmt = $conn->prepare("SELECT id, email, name as full_name FROM blood_bank WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $stmt->close();
        return ['type' => 'blood_bank', 'data' => $row];
    }
    $stmt->close();

    return null;
}

$account = findEmail($conn, $email);

if (!$account) {
    // Don't reveal if email exists or not (security)
    sendJson(true, 'If this email exists in our system, you will receive a password reset link shortly.');
}

// Generate reset token
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Store token in database (create password_resets table if not exists)
$conn->query("CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    account_type ENUM('admin','user','blood_bank') NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_email (email)
)");

// Delete old tokens for this email
$stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->close();

// Insert new token
$stmt = $conn->prepare("INSERT INTO password_resets (email, token, account_type, expires_at) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $email, $token, $account['type'], $expires);
$stmt->execute();
$stmt->close();

// Send email via SMTP (PHPMailer)
$resetLink = "http://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . "/reset_password.php?token=" . $token;

$subject = "BloodBridge - Password Reset Request";
$message = "
<html>
<head><title>Password Reset</title></head>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2 style='color: #C0162C;'>BloodBridge Password Reset</h2>
        <p>Hello <strong>" . htmlspecialchars($account['data']['full_name']) . "</strong>,</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        <p style='text-align: center; margin: 30px 0;'>
            <a href='" . $resetLink . "' style='background: #C0162C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block;'>Reset Password</a>
        </p>
        <p>Or copy and paste this link:</p>
        <p style='background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;'>" . $resetLink . "</p>
        <p><strong>This link expires in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
        <p style='font-size: 0.9rem; color: #666;'>BloodBridge - Saving Lives Through Technology</p>
    </div>
</body>
</html>
";

$mailSent = sendMail($email, $subject, $message);

if ($mailSent) {
    sendJson(true, 'Password reset link has been sent to your email. Please check your inbox (and spam folder).');
} else {
    error_log("Failed to send password reset email to: " . $email);
    sendJson(true, 'If this email exists in our system, you will receive a password reset link shortly.');
}
