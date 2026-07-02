<?php
session_start();
require_once 'config.php';

$token = $_COOKIE['remember_token'] ?? '';
if ($token) {
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
    $stmt = $conn->prepare("DELETE FROM remember_tokens WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $stmt->close();
    setcookie('remember_token', '', time() - 3600, '/');
    setcookie('remember_email', '', time() - 3600, '/');
}

if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

$_SESSION = array();
session_destroy();

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Location: login.html');
exit;
