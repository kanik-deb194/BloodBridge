<?php
session_start();
require_once 'oauth_config.php';
require_once 'config.php';

if (!isOAuthConfigured('google')) {
    header('Location: login.html?error=' . urlencode('Google OAuth is not configured. Please set up credentials in oauth_config.php'));
    exit;
}

$clientId = $googleConfig['client_id'];
$clientSecret = $googleConfig['client_secret'];
$redirectUri = getOAuthRedirectUri('google');

// Verify state parameter
if (!isset($_GET['state']) || !isset($_SESSION['oauth_state']) || $_GET['state'] !== $_SESSION['oauth_state']) {
    header('Location: login.html?error=' . urlencode('Invalid state parameter. Possible CSRF attack.'));
    exit;
}

// Check for error
if (isset($_GET['error'])) {
    header('Location: login.html?error=' . urlencode($_GET['error']));
    exit;
}

// Check for authorization code
if (!isset($_GET['code'])) {
    header('Location: login.html?error=No authorization code received');
    exit;
}

$code = $_GET['code'];

// Exchange code for access token
$tokenUrl = 'https://oauth2.googleapis.com/token';
$postData = [
    'code' => $code,
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri' => $redirectUri,
    'grant_type' => 'authorization_code'
];

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Remove in production
$tokenResponse = curl_exec($ch);
curl_close($ch);

$tokenData = json_decode($tokenResponse, true);

if (!isset($tokenData['access_token'])) {
    header('Location: login.html?error=Failed to get access token');
    exit;
}

$accessToken = $tokenData['access_token'];

// Get user info from Google
$userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
$ch = curl_init($userInfoUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Remove in production
$userResponse = curl_exec($ch);
curl_close($ch);

$userData = json_decode($userResponse, true);

if (!isset($userData['email'])) {
    header('Location: login.html?error=Failed to get user info');
    exit;
}

$email = $userData['email'];
$name = $userData['name'] ?? $email;
$googleId = $userData['id'] ?? '';
$picture = $userData['picture'] ?? '';

// Check if user exists in database
function findUserByEmail($conn, $email) {
    // Check users table
    $stmt = $conn->prepare("SELECT id, email, full_name, role, is_active FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $stmt->close();
        return ['type' => 'user', 'data' => $row];
    }
    $stmt->close();

    // Check blood_bank table
    $stmt = $conn->prepare("SELECT id, email, name as full_name, role, status FROM blood_bank WHERE email = ? LIMIT 1");
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

$existingUser = findUserByEmail($conn, $email);

$_SESSION['oauth_email'] = $email;
$_SESSION['oauth_name'] = $name;
$_SESSION['oauth_picture'] = $picture;
$_SESSION['oauth_provider'] = 'google';
$_SESSION['oauth_exists'] = $existingUser ? 'yes' : 'no';

header('Location: oauth_register.php');
exit;
