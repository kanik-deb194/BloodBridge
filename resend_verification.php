<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'config.php';
require_once 'mail_config.php';

$email = trim($_POST['email'] ?? '');
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJson(false, 'Invalid email address.');
}

$stmt = $conn->prepare("SELECT id, full_name, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    sendJson(false, 'No account found with this email.');
}

if ($user['is_active'] == 1) {
    sendJson(false, 'This account is already verified. You can log in.');
}

// Generate new token
$verifToken = bin2hex(random_bytes(32));
$tokenExpires = date('Y-m-d H:i:s', time() + 86400);

$update = $conn->prepare("UPDATE users SET verification_token = ?, token_expires = ? WHERE id = ?");
$update->bind_param('ssi', $verifToken, $tokenExpires, $user['id']);
$update->execute();
$update->close();

// Send email
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$basePath = dirname($_SERVER['SCRIPT_NAME']);
$verifLink = "{$protocol}://{$_SERVER['HTTP_HOST']}{$basePath}/verify_email.php?token={$verifToken}";
$subject = 'BloodBridge — Verify your email (resend)';
$htmlBody = '
<div style="max-width:560px;margin:0 auto;font-family:\'Outfit\',Arial,sans-serif;background:#0e0a0b;border-radius:20px;overflow:hidden;border:1px solid rgba(192,22,44,0.2);">
  <div style="background:linear-gradient(135deg,#C0162C,#8B0020);padding:30px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">Blood<span style="color:#f5a0a8;">Bridge</span></h1>
    <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Verify your email address</p>
  </div>
  <div style="padding:32px 30px;color:#F5F0EE;">
    <p style="font-size:15px;margin:0 0 16px;">Hi <strong>' . htmlspecialchars($user['full_name']) . '</strong>,</p>
    <p style="font-size:14px;color:rgba(245,240,238,0.7);margin:0 0 20px;line-height:1.7;">
      Here is a new verification link. It expires in <strong>24 hours</strong>.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="' . $verifLink . '" style="display:inline-block;padding:14px 36px;border-radius:50px;background:linear-gradient(135deg,#C0162C,#8B0020);color:#fff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 6px 24px rgba(192,22,44,0.4);">Verify My Email</a>
    </div>
  </div>
  <div style="border-top:1px solid rgba(192,22,44,0.15);padding:18px 30px;text-align:center;">
    <p style="font-size:12px;color:rgba(245,240,238,0.35);margin:0;">🇧🇩 BloodBridge Bangladesh</p>
  </div>
</div>';
sendMail($email, $subject, $htmlBody);

sendJson(true, 'Verification email resent. Please check your inbox.');
