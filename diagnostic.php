<?php
/**
 * BloodBridge Diagnostic Tool
 * Run this file from your browser to check for common issues.
 * Access: http://localhost/Blood_Merged/Final_Updated_Blood_Bridge_1/diagnostic.php
 */
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>";
echo "<title>BloodBridge Diagnostic</title>";
echo "<style>
body{font-family:'Segoe UI',sans-serif;background:#0d0d0d;color:#e0e0e0;max-width:900px;margin:40px auto;padding:20px;}
h1{color:#ef4444;border-bottom:2px solid #ef4444;padding-bottom:10px;}
h2{color:#f97316;margin-top:30px;}
.pass{color:#22c55e;font-weight:700;}
.fail{color:#ef4444;font-weight:700;}
.warn{color:#f59e0b;font-weight:700;}
.info{color:#60a5fa;}
pre{background:#1a1a1a;padding:12px;border-radius:8px;overflow:auto;font-size:13px;}
table{width:100%;border-collapse:collapse;margin:10px 0;}
td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #333;}
th{background:#1a1a1a;color:#f97316;}
td{font-family:monospace;}
</style></head><body>";
echo "<h1>🧪 BloodBridge Diagnostic</h1>";

$checks = [];
$checkCount = 0;
$passCount = 0;

function check($label, $ok, $detail = '') {
    global $checkCount, $passCount;
    $checkCount++;
    if ($ok) $passCount++;
    $cls = $ok ? 'pass' : 'fail';
    $icon = $ok ? '✅' : '❌';
    echo "<tr><td>$icon</td><td class='$cls'>" . ($ok ? 'PASS' : 'FAIL') . "</td><td>$label</td><td class='info'>$detail</td></tr>";
}

function checkWarn($label, $detail = '') {
    echo "<tr><td>⚠️</td><td class='warn'>WARN</td><td>$label</td><td class='info'>$detail</td></tr>";
}

// ── PHP Version ──
echo "<h2>1. PHP Environment</h2><table>";
check("PHP Version >= 8.0", PHP_VERSION_ID >= 80000, PHP_VERSION);
check("Session extension", extension_loaded('session'), '');
check("JSON extension", extension_loaded('json'), '');
check("MySQLi extension", extension_loaded('mysqli'), '');
check("OpenSSL extension", extension_loaded('openssl'), '');
check("MBString extension", extension_loaded('mbstring'), '');
echo "</table>";

// ── File Checks ──
echo "<h2>2. Required Files</h2><table>";
$base = __DIR__;
$files = [
    'config.php', 'login.php', 'auto_login.php', 'check_session.php',
    'logout.php', 'signup.php', 'forgot_password.php', 'reset_password.php',
    'mail_config.php', 'login.html', 'signup.html', 'index.html',
    'donor_recipient_api.php', 'donor_recipient_dash.php', 'donor_recipient_dash.html',
    'donor_recipient_dash.js', 'donor_recipient_dash.css',
    'bank_api.php', 'bankdash.html', 'bankdash.js', 'bankdash.css',
    'hospital_api.php', 'hospital_dash.html', 'hospital_dash.js', 'hospital_dash.css',
    'mc_api.php', 'medical_college_dash.html', 'medical_college_dash.js', 'medical_college_dash.css',
    'admin_api.php', 'admindash.html', 'admindash.js', 'admindash.css',
    'doctor_api.php', 'doctor_dash.html', 'doctor_dash.js', 'doctor_dash.css',
    'lab_api.php', 'lab_technician_dash.html', 'lab_technician_dash.js', 'lab_technician_dash.css',
    'delivery_api.php', 'delivery_staff_dash.html', 'delivery_staff_dash.js', 'delivery_staff_dash.css',
    'chat_api.php', 'ai_functions.php', 'raktosathi_floating.js', 'raktosathi_floating.css',
    'script.js', 'style.css',
    'vendor/phpmailer/src/PHPMailer.php',
];
foreach ($files as $f) {
    $path = $base . '/' . $f;
    check($f, file_exists($path), file_exists($path) ? round(filesize($path)/1024,1).' KB' : 'MISSING');
}
echo "</table>";

// ── Database Connection ──
echo "<h2>3. Database Connection</h2><table>";
try {
    require_once $base . '/config.php';
    check("Database connection", isset($conn) && !$conn->connect_error, $conn->connect_error ?? 'Connected');
    
    // Test query
    $r = $conn->query("SELECT 1 AS test");
    check("Basic query", $r !== false, 'Can execute queries');
    
    // ── Table checks ──
    echo "</table><h2>4. Database Tables</h2><table>";
    $expectedTables = [
        'users', 'admin', 'blood_bank', 'donor_recipient', 'blood_request', 'blood_bag',
        'donation', 'donation_promise', 'notification', 'emergency_request',
        'drone', 'drone_dispatch', 'patient_registry', 'donor_health_record',
        'bank_review', 'family_legacy', 'address', 'storage_unit', 'transfusion',
        'chat_log', 'blood_culture_test', 'approval_step', 'admin_warning',
        'temperature_log', 'partner_links', 'thalassemia_carrier', 'thalassemia_couple_alert',
        'request_timeline', 'expiry_alert', 'remember_tokens', 'password_resets',
        'donor_rewards', 'system_settings', 'notification_template',
    ];
    
    $existing = [];
    $r = $conn->query("SHOW TABLES");
    if ($r) {
        while ($row = $r->fetch_array()) {
            $existing[] = $row[0];
        }
    }
    
    foreach ($expectedTables as $tbl) {
        if (in_array($tbl, $existing)) {
            check("Table: $tbl", true, 'EXISTS');
        } else {
            check("Table: $tbl", false, 'MISSING - run db_schema_fix.sql');
        }
    }
    
    // ── Check admin_warning column ──
    if (in_array('admin_warning', $existing)) {
        $r = $conn->query("SHOW COLUMNS FROM admin_warning LIKE 'admin_improvement_plan'");
        if ($r && $r->num_rows === 0) {
            checkWarn("admin_warning missing 'admin_improvement_plan' column", "Run: ALTER TABLE admin_warning ADD COLUMN admin_improvement_plan TEXT");
        }
    }
    
    // ── Check request_timeline columns ──
    if (in_array('request_timeline', $existing)) {
        foreach (['previous_hash', 'current_hash'] as $col) {
            $r = $conn->query("SHOW COLUMNS FROM request_timeline LIKE '$col'");
            if ($r && $r->num_rows === 0) {
                checkWarn("request_timeline missing '$col' column", "Run: ALTER TABLE request_timeline ADD COLUMN $col VARCHAR(64)");
            }
        }
    }
    
} catch (Throwable $e) {
    check("Database connection", false, $e->getMessage());
}
echo "</table>";

// ── Session Test ──
echo "<h2>5. Session Test</h2><table>";
if (session_status() === PHP_SESSION_NONE) session_start();
$_SESSION['diag_test'] = time();
check("Session write", isset($_SESSION['diag_test']), 'Session ID: ' . session_id());
check("Session cookie", isset($_COOKIE[session_name()]) || ini_get('session.use_cookies') == 0, 'Cookie: ' . ($_COOKIE[session_name()] ?? 'N/A (may use trans-sid)'));
echo "</table>";

// ── Config Constants ──
echo "<h2>6. Configuration</h2><table>";
check("sendJson() function", function_exists('sendJson'), '');
check("sanitize() function", function_exists('sanitize'), '');
check("DB host: $host", !empty($host), $host);
check("DB name: $database", !empty($database), $database);
echo "</table>";

// ── Error Log ──
echo "<h2>7. Recent Errors (last 20)</h2><pre>";
$logFile = $base . '/php_errors.log';
if (file_exists($logFile)) {
    $lines = file($logFile);
    $recent = array_slice($lines, -20);
    foreach ($recent as $line) {
        $line = trim($line);
        if (empty($line)) continue;
        // Highlight errors from THIS directory
        if (strpos($line, 'Final_Updated_Blood_Bridge_1') !== false) {
            echo "<span style='color:#ef4444;font-weight:700;'>$line</span>\n";
        } elseif (strpos($line, 'Fatal') !== false || strpos($line, 'Parse') !== false) {
            echo "<span style='color:#f59e0b;'>$line</span>\n";
        } else {
            echo "$line\n";
        }
    }
} else {
    echo "No error log found.\n";
}
echo "</pre>";

// ── Summary ──
echo "<h2>Summary</h2>";
$pct = round(($passCount / max($checkCount, 1)) * 100);
$cls = $pct >= 90 ? 'pass' : ($pct >= 70 ? 'warn' : 'fail');
echo "<p style='font-size:1.2rem;'>$passCount / $checkCount checks passed (<span class='$cls'>$pct%</span>)</p>";

if ($checkCount > $passCount) {
    echo "<div style='background:#1a1a1a;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin-top:16px;'>";
    echo "<strong style='color:#ef4444;'>Issues Found:</strong><br>";
    echo "• Some database tables are missing. Run <code>db_schema_fix.sql</code> in phpMyAdmin.<br>";
    echo "• Open your browser's DevTools (F12) → Console to check for JavaScript errors.<br>";
    echo "• Check the error log above for PHP errors from this directory.<br>";
    echo "</div>";
} else {
    echo "<div style='background:#1a1a1a;border-left:4px solid #22c55e;padding:16px;border-radius:8px;margin-top:16px;'>";
    echo "<strong style='color:#22c55e;'>All basic checks passed!</strong><br>";
    echo "If you're still having issues, check the browser console (F12) for JavaScript errors.";
    echo "</div>";
}

echo "</body></html>";
