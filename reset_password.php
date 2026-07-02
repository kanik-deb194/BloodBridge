<?php
session_start();
require_once 'config.php';

// Show form if GET request with token
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';

    if (empty($token)) {
        die('<div style="text-align:center; padding:50px; font-family:Arial;"><h2 style="color:#C0162C;">Invalid or expired token</h2><p>Please request a new password reset.</p><a href="login.html" style="color:#ff6b81;">Back to Login</a></div>');
    }

    // Verify token
    $stmt = $conn->prepare("SELECT email, account_type, expires_at, used FROM password_resets WHERE token = ? LIMIT 1");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        die('<div style="text-align:center; padding:50px; font-family:Arial;"><h2 style="color:#C0162C;">Invalid or expired token</h2><p>Please request a new password reset.</p><a href="login.html" style="color:#ff6b81;">Back to Login</a></div>');
    }

    $resetData = $result->fetch_assoc();
    $stmt->close();

    if ($resetData['used'] == 1) {
        die('<div style="text-align:center; padding:50px; font-family:Arial;"><h2 style="color:#C0162C;">Token already used</h2><p>This reset link has already been used. Please request a new one.</p><a href="login.html" style="color:#ff6b81;">Back to Login</a></div>');
    }

    if (strtotime($resetData['expires_at']) < time()) {
        die('<div style="text-align:center; padding:50px; font-family:Arial;"><h2 style="color:#C0162C;">Token expired</h2><p>This reset link has expired. Please request a new one.</p><a href="login.html" style="color:#ff6b81;">Back to Login</a></div>');
    }

    // Show reset form
?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - BloodBridge</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Outfit', sans-serif;
                background: #0e0a0b;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                color: white;
                overflow: hidden;
            }
            .bg-scene {
                position: fixed; inset: 0;
                background: radial-gradient(circle at 30% 20%, rgba(192,22,44,0.2), transparent 50%),
                            radial-gradient(circle at 70% 80%, rgba(255,0,60,0.12), transparent 40%),
                            #0e0a0b;
            }
            .container { width: 100%; max-width: 440px; padding: 20px; position: relative; z-index: 1; }
            .card {
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 24px;
                padding: 40px 30px;
                backdrop-filter: blur(25px);
                animation: fadeUp 0.6s ease;
            }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            h1 { text-align: center; margin-bottom: 8px; font-size: 1.8rem; }
            .form-sub { text-align: center; color: rgba(255,255,255,0.55); font-size: 0.9rem; margin-bottom: 28px; }
            .input-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.9rem; }
            input {
                width: 100%; padding: 14px 16px; border: none; border-radius: 12px;
                background: rgba(255,255,255,0.08); color: white;
                border: 1px solid transparent; transition: 0.3s; font-size: 0.95rem;
            }
            input:focus { outline: none; border-color: #C0162C; box-shadow: 0 0 15px rgba(192,22,44,0.3); }
            input::placeholder { color: rgba(255,255,255,0.35); }
            .btn-submit {
                width: 100%; padding: 14px; border: none; border-radius: 50px;
                background: linear-gradient(135deg, #C0162C, #8B0020);
                color: white; font-size: 1rem; font-weight: 600; cursor: pointer;
                transition: 0.3s; margin-top: 6px; position: relative;
                display: flex; align-items: center; justify-content: center; gap: 8px;
            }
            .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 0 25px rgba(192,22,44,0.5); }
            .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
            .btn-loader { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            .message { padding: 12px 14px; margin-bottom: 16px; border-radius: 10px; font-size: 0.88rem; display: none; align-items: center; gap: 8px; }
            .message.error { background: rgba(192,22,44,0.15); border: 1px solid rgba(192,22,44,0.3); color: #FF6B6B; display: flex; }
            .back-link { text-align: center; margin-top: 18px; }
            .back-link a { color: #ff6b81; text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
            .back-link a:hover { color: #ff8da0; text-decoration: underline; }

            /* ===== Success Overlay ===== */
            .success-overlay {
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(14,10,11,0.92);
                backdrop-filter: blur(16px);
                display: none; align-items: center; justify-content: center;
                animation: overlayIn 0.5s ease;
            }
            .success-overlay.show { display: flex; }
            @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
            .success-box {
                text-align: center; padding: 50px 40px; max-width: 420px;
                animation: boxPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes boxPop { from { opacity: 0; transform: scale(0.8) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            .checkmark {
                width: 80px; height: 80px; border-radius: 50%;
                background: linear-gradient(135deg, #22c55e, #16a34a);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 24px; font-size: 2.4rem; color: white;
                box-shadow: 0 0 50px rgba(34,197,94,0.35);
                animation: checkPulse 1.5s ease infinite;
            }
            @keyframes checkPulse { 0%, 100% { box-shadow: 0 0 50px rgba(34,197,94,0.35); } 50% { box-shadow: 0 0 80px rgba(34,197,94,0.5); } }
            .success-box h2 { font-size: 1.6rem; margin-bottom: 8px; }
            .success-box p { color: rgba(255,255,255,0.6); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.5; }
            .countdown-ring {
                position: relative; width: 72px; height: 72px; margin: 0 auto 12px;
            }
            .countdown-ring svg { transform: rotate(-90deg); }
            .countdown-ring .bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 4; }
            .countdown-ring .progress {
                fill: none; stroke: #C0162C; stroke-width: 4; stroke-linecap: round;
                stroke-dasharray: 188.5; stroke-dashoffset: 0;
                transition: stroke-dashoffset 1s linear;
            }
            .countdown-number {
                position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                font-size: 1.4rem; font-weight: 700; color: white;
            }
            .countdown-label { color: rgba(255,255,255,0.4); font-size: 0.8rem; }
        </style>
    </head>

    <body>
        <div class="bg-scene"></div>
        <div class="container">
            <div class="card">
                <h1>🔐 Reset Password</h1>
                <p class="form-sub">Choose a strong new password for your account</p>
                <div id="message" class="message"></div>
                <form id="resetForm">
                    <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                    <div class="input-group">
                        <label>New Password</label>
                        <input type="password" id="newPass" name="new_password" placeholder="Enter new password (min 8 characters)" required minlength="8">
                    </div>
                    <div class="input-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirmPass" name="confirm_password" placeholder="Confirm new password" required minlength="8">
                    </div>
                    <button type="submit" class="btn-submit" id="submitBtn">
                        <span id="btnText">Reset Password</span>
                        <span class="btn-loader" id="btnLoader"></span>
                    </button>
                </form>
                <div class="back-link">
                    <a href="login.html">← Back to Login</a>
                </div>
            </div>
        </div>

        <!-- Success Overlay -->
        <div class="success-overlay" id="successOverlay">
            <div class="success-box">
                <div class="checkmark">✓</div>
                <h2>Password Reset Successful!</h2>
                <p>Your password has been updated. You'll be redirected to the login page to sign in with your new password.</p>
                <div class="countdown-ring">
                    <svg width="72" height="72" viewBox="0 0 72 72">
                        <circle class="bg" cx="36" cy="36" r="30"></circle>
                        <circle class="progress" id="progressRing" cx="36" cy="36" r="30"></circle>
                    </svg>
                    <div class="countdown-number" id="countdownNum">5</div>
                </div>
                <div class="countdown-label">Redirecting...</div>
            </div>
        </div>

        <script>
            document.getElementById('resetForm').addEventListener('submit', function(e) {
                e.preventDefault();

                const newPass = document.getElementById('newPass').value;
                const confirmPass = document.getElementById('confirmPass').value;
                const msg = document.getElementById('message');
                const submitBtn = document.getElementById('submitBtn');
                const btnText = document.getElementById('btnText');
                const btnLoader = document.getElementById('btnLoader');

                msg.className = 'message';
                msg.style.display = 'none';

                if (newPass !== confirmPass) {
                    msg.className = 'message error';
                    msg.textContent = 'Passwords do not match!';
                    return;
                }
                if (newPass.length < 8) {
                    msg.className = 'message error';
                    msg.textContent = 'Password must be at least 8 characters!';
                    return;
                }

                submitBtn.disabled = true;
                btnText.textContent = 'Resetting...';
                btnLoader.style.display = 'inline-block';

                const fd = new FormData(this);

                fetch('reset_password.php', { method: 'POST', body: fd })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.success) {
                            document.getElementById('successOverlay').classList.add('show');
                            var count = 5;
                            var numEl = document.getElementById('countdownNum');
                            var ring = document.getElementById('progressRing');
                            var circumference = 188.5;
                            ring.style.strokeDashoffset = '0';
                            var interval = setInterval(function() {
                                count--;
                                numEl.textContent = count;
                                ring.style.strokeDashoffset = circumference * (1 - count / 5);
                                if (count <= 0) {
                                    clearInterval(interval);
                                    window.location.href = 'login.html';
                                }
                            }, 1000);
                        } else {
                            msg.className = 'message error';
                            msg.textContent = data.message;
                            submitBtn.disabled = false;
                            btnText.textContent = 'Reset Password';
                            btnLoader.style.display = 'none';
                        }
                    })
                    .catch(function() {
                        msg.className = 'message error';
                        msg.textContent = 'Network error. Please try again.';
                        submitBtn.disabled = false;
                        btnText.textContent = 'Reset Password';
                        btnLoader.style.display = 'none';
                    });
            });
        </script>
    </body>

    </html>
<?php
    exit;
}

// Handle POST request (actual password reset)
header('Content-Type: application/json; charset=utf-8');

$token = trim($_POST['token'] ?? '');
$newPassword = trim($_POST['new_password'] ?? '');
$confirmPassword = trim($_POST['confirm_password'] ?? '');

if (empty($token) || empty($newPassword) || empty($confirmPassword)) {
    sendJson(false, 'All fields are required.');
}

if ($newPassword !== $confirmPassword) {
    sendJson(false, 'Passwords do not match.');
}

if (strlen($newPassword) < 8) {
    sendJson(false, 'Password must be at least 8 characters long.');
}

// Verify token again
$stmt = $conn->prepare("SELECT email, account_type, expires_at, used FROM password_resets WHERE token = ? LIMIT 1");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendJson(false, 'Invalid or expired reset token.');
}

$resetData = $result->fetch_assoc();
$stmt->close();

if ($resetData['used'] == 1) {
    sendJson(false, 'This reset link has already been used.');
}

if (strtotime($resetData['expires_at']) < time()) {
    sendJson(false, 'This reset link has expired.');
}

// Hash new password
$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
$email = $resetData['email'];
$accountType = $resetData['account_type'];

// Update password in correct table
if ($accountType === 'admin') {
    $stmt = $conn->prepare("UPDATE admin SET password_hash = ? WHERE email = ?");
} elseif ($accountType === 'user') {
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
} elseif ($accountType === 'blood_bank') {
    $stmt = $conn->prepare("UPDATE blood_bank SET password_hash = ? WHERE email = ?");
} else {
    sendJson(false, 'Unknown account type.');
}

$stmt->bind_param("ss", $hashedPassword, $email);
$stmt->execute();
$stmt->close();

// Mark token as used
$stmt = $conn->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$stmt->close();

sendJson(true, 'Password reset successful! You can now log in with your new password.', 'login.html');
