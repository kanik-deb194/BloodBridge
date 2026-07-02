<?php
require_once 'config.php';

$token = trim($_GET['token'] ?? '');
if (empty($token)) {
    die('Invalid verification link.');
}

// Find user with this token
$stmt = $conn->prepare("SELECT id, email, full_name, token_expires, is_active FROM users WHERE verification_token = ? LIMIT 1");
$stmt->bind_param('s', $token);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    $error = 'Invalid or expired verification link.';
} elseif ($user['is_active'] == 1) {
    $message = 'Your email is already verified. You can log in now.';
    $alreadyVerified = true;
} elseif (strtotime($user['token_expires']) < time()) {
    $error = 'This verification link has expired. Please request a new one.';
} else {
    // Activate the user
    $update = $conn->prepare("UPDATE users SET is_active = 1, verification_token = NULL, token_expires = NULL WHERE id = ?");
    $update->bind_param('i', $user['id']);
    $update->execute();
    $update->close();
    $message = '✓ Email verified successfully! You can now log in to your account.';
}

$theme = $_COOKIE['bb-theme'] ?? 'dark';
?><!DOCTYPE html>
<html lang="en" data-theme="<?= htmlspecialchars($theme) ?>">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email Verified — BloodBridge</title>
<link rel="icon" type="image/png" href="blood_bridge_favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--red:#C0162C;--red-light:#E8294A;--green:#4ade80;}
[data-theme="dark"]{--bg:#0e0a0b;--text:#F5F0EE;--text-muted:rgba(245,240,238,0.55);}
[data-theme="light"]{--bg:#faf7f8;--text:#1a0508;--text-muted:rgba(30,10,15,0.5);}
body{
  font-family:'Outfit',sans-serif;background:var(--bg);color:var(--text);
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  transition:background 0.4s;padding:20px;
}
.result-card{
  max-width:440px;width:100%;text-align:center;
  padding:48px 36px;border-radius:24px;
  background:rgba(255,255,255,0.04);backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,0.08);
  box-shadow:0 24px 80px rgba(0,0,0,0.4);
  animation:fadeUp 0.6s ease both;
}
[data-theme="light"] .result-card{background:rgba(255,255,255,0.7);border-color:rgba(192,22,44,0.1);}
.icon-wrap{width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px;}
.icon-wrap.success{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.2);}
.icon-wrap.error{background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.2);}
.icon-wrap.info{background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.2);}
h1{font-size:1.5rem;font-weight:800;margin-bottom:10px;}
h1 .green{color:var(--green);}
h1 .red{color:#f87171;}
h1 .blue{color:#60a5fa;}
p{font-size:0.92rem;color:var(--text-muted);line-height:1.7;margin-bottom:20px;}
.btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 32px;border-radius:50px;font-size:0.9rem;font-weight:700;
  background:linear-gradient(135deg,var(--red),#8B0020);color:#fff;
  text-decoration:none;box-shadow:0 4px 24px rgba(192,22,44,0.35);
  transition:all 0.3s;
}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(192,22,44,0.5);}
.btn-outline{
  display:inline-block;padding:10px 24px;border-radius:50px;font-size:0.82rem;font-weight:600;
  color:var(--text-muted);text-decoration:none;border:1px solid rgba(255,255,255,0.1);
  transition:all 0.3s;margin-top:14px;
}
[data-theme="light"] .btn-outline{border-color:rgba(192,22,44,0.15);}
.btn-outline:hover{color:var(--text);border-color:rgba(255,255,255,0.2);}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px);}to{opacity:1;transform:translateY(0);}}
@media(max-width:500px){.result-card{padding:32px 20px;}}
</style>
</head>
<body>
<div class="result-card">
  <?php if (isset($error)): ?>
    <div class="icon-wrap error">❌</div>
    <h1 class="red">Verification Failed</h1>
    <p><?= htmlspecialchars($error) ?></p>
    <a href="login.html" class="btn">Go to Login</a>
  <?php elseif (isset($alreadyVerified) && $alreadyVerified): ?>
    <div class="icon-wrap info">ℹ️</div>
    <h1 class="blue">Already Verified</h1>
    <p><?= htmlspecialchars($message) ?></p>
    <a href="login.html" class="btn">Go to Login</a>
  <?php else: ?>
    <div class="icon-wrap success">✅</div>
    <h1 class="green">Email Verified!</h1>
    <p><?= htmlspecialchars($message) ?></p>
    <a href="login.html" class="btn">Login to Your Account →</a>
  <?php endif; ?>
  <br/>
  <a href="landing_page.html" class="btn-outline">← Back to Home</a>
</div>
</body>
</html>
