<?php
ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

try {

    if ($conn->connect_error) {
        throw new Exception('Database connection failed.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');
    $remember = isset($_POST['remember']) && $_POST['remember'] === '1';

    if (empty($email) || empty($password)) {
        throw new Exception('Please enter both email and password.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Please enter a valid email address.');
    }

    /**
     * Find account across all tables.
     * If one table's query fails (e.g. missing column), we LOG it and continue to the next table.
     */
    function findAccount($conn, $email)
    {
        // 1. Check ADMIN table (no 'status' column in schema!)
        $sql = "SELECT id, email, full_name, password_hash, role, 'active' as status, 'admin' as account_type 
                FROM admin WHERE email = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res && $res->num_rows > 0) {
                $row = $res->fetch_assoc();
                $stmt->close();
                return ['type' => 'admin', 'data' => $row];
            }
            $stmt->close();
        } else {
            error_log("Login admin prepare error: " . $conn->error);
        }

        // 2. Check BLOOD_BANK table FIRST (so bank/hospital/mc accounts don't match users with same email)
        $sql = "SELECT id, email, name as full_name, password_hash, role, status, 'blood_bank' as account_type 
                FROM blood_bank WHERE email = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res && $res->num_rows > 0) {
                $row = $res->fetch_assoc();
                $stmt->close();
                return ['type' => 'blood_bank', 'data' => $row];
            }
            $stmt->close();
        } else {
            error_log("Login blood_bank prepare error: " . $conn->error);
        }

        // 3. Check USERS table (has 'is_active', not 'status')
        $sql = "SELECT id, email, full_name, password_hash, role, is_active, 'user' as account_type 
                FROM users WHERE email = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res && $res->num_rows > 0) {
                $row = $res->fetch_assoc();
                $stmt->close();
                return ['type' => 'user', 'data' => $row];
            }
            $stmt->close();
        } else {
            error_log("Login users prepare error: " . $conn->error);
        }

        return null;
    }

    $account = findAccount($conn, $email);
    if (!$account) {
        throw new Exception('No account found with this email address.');
    }

    $userData = $account['data'];
    $accountType = $account['type'];

    // Verify password
    if (!password_verify($password, $userData['password_hash'])) {
        throw new Exception('Incorrect password. Please try again.');
    }

    // Check account status
    if ($accountType === 'blood_bank') {
        if (isset($userData['status']) && strtolower($userData['status']) !== 'active') {
            throw new Exception('Your account is inactive. Please contact support.');
        }
    } elseif ($accountType === 'user') {
        if (isset($userData['is_active']) && $userData['is_active'] != 1) {
            ob_end_clean();
            echo json_encode([
                'success' => false,
                'not_verified' => true,
                'message' => 'Please verify your email before logging in. Check your inbox (and Spam folder) for the verification link.',
                'redirect' => ''
            ]);
            exit;
        }
    }
    // Admin accounts are always considered active (no status column)

    // Remember Me cookies
    if ($remember) {
        $token = bin2hex(random_bytes(32));
        $expires = time() + (30 * 24 * 60 * 60);
        $expiresAt = date('Y-m-d H:i:s', $expires);

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

        $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare("INSERT INTO remember_tokens (email, account_type, token, expires_at) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $email, $accountType, $token, $expiresAt);
        $stmt->execute();
        $stmt->close();

        setcookie('remember_token', $token, [
            'expires' => $expires,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Strict'
        ]);
        setcookie('remember_email', $email, [
            'expires' => $expires,
            'path' => '/',
            'secure' => false,
            'httponly' => false,
            'samesite' => 'Strict'
        ]);
    } else {
        setcookie('remember_token', '', ['expires' => time() - 3600, 'path' => '/']);
        setcookie('remember_email', '', ['expires' => time() - 3600, 'path' => '/']);
    }

    // Session security
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }

    $_SESSION['user_id']    = $userData['id'];
    $_SESSION['user_name']  = $userData['full_name'];
    $_SESSION['user_email'] = $userData['email'];
    $_SESSION['role']       = $accountType;
    $_SESSION['sub_role']   = $userData['role'] ?? '';
    $_SESSION['login_time'] = time();
    if ($accountType === 'blood_bank') {
        $_SESSION['blood_bank_id'] = $userData['id'];
    }

    // Redirect based on role
    $redirect = '';
    if ($accountType === 'admin') {
        $redirect = 'admindash.html';
    } elseif ($accountType === 'blood_bank') {
        $subRole = $userData['role'] ?? '';
        $map = [
            'blood_bank'      => 'bankdash.html',
            'hospital'        => 'hospital_dash.html',
            'medical_college' => 'medical_college_dash.html'
        ];
        $redirect = $map[$subRole] ?? 'bankdash.html';
    } elseif ($accountType === 'user') {
        $subRole = $userData['role'] ?? '';
        $map = [
            'donor_recipient' => 'donor_recipient_dash.html',
            'doctor'          => 'doctor_dash.html',
            'lab_technician'  => 'lab_technician_dash.html',
            'delivery_staff'  => 'delivery_staff_dash.html'
        ];
        $redirect = $map[$subRole] ?? 'donor_recipient_dash.html';
    }

    ob_end_clean();
    sendJson(true, 'Login successful! Welcome back, ' . $userData['full_name'] . '.', $redirect);
} catch (Exception $e) {
    ob_end_clean();
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'redirect' => ''
    ]);
    exit;
}
