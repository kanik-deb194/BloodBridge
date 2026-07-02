<?php
session_start();
require_once 'oauth_config.php';
require_once 'config.php';

if (!isOAuthConfigured('github')) {
    header('Location: login.html?error=' . urlencode('GitHub OAuth is not configured. Please set up credentials in oauth_config.php'));
    exit;
}

$clientId = $githubConfig['client_id'];
$clientSecret = $githubConfig['client_secret'];
$redirectUri = getOAuthRedirectUri('github');

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
$tokenUrl = 'https://github.com/login/oauth/access_token';
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
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Remove in production
$tokenResponse = curl_exec($ch);
curl_close($ch);

$tokenData = json_decode($tokenResponse, true);

if (!isset($tokenData['access_token'])) {
    header('Location: login.html?error=Failed to get access token');
    exit;
}

$accessToken = $tokenData['access_token'];

// Get user info from GitHub
$userInfoUrl = 'https://api.github.com/user';
$ch = curl_init($userInfoUrl);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: token ' . $accessToken,
    'User-Agent: BloodBridge-App'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Remove in production
$userResponse = curl_exec($ch);
curl_close($ch);

$userData = json_decode($userResponse, true);

if (!isset($userData['login'])) {
    header('Location: login.html?error=Failed to get user info');
    exit;
}

// Get email from GitHub (may need separate API call if not public)
$email = $userData['email'] ?? '';
if (empty($email)) {
    $emailUrl = 'https://api.github.com/user/emails';
    $ch = curl_init($emailUrl);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: token ' . $accessToken,
        'User-Agent: BloodBridge-App'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $emailResponse = curl_exec($ch);
    curl_close($ch);

    $emails = json_decode($emailResponse, true);
    if (is_array($emails) && count($emails) > 0) {
        foreach ($emails as $emailObj) {
            if ($emailObj['primary'] && $emailObj['verified']) {
                $email = $emailObj['email'];
                break;
            }
        }
        if (empty($email)) {
            $email = $emails[0]['email'];
        }
    }
}

if (empty($email)) {
    header('Location: login.html?error=Could not retrieve email from GitHub');
    exit;
}

$name = $userData['name'] ?? $userData['login'] ?? $email;
$githubId = $userData['id'] ?? '';
$picture = $userData['avatar_url'] ?? '';

// Check if user exists in database
function findUserByEmail($conn, $email) {
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
$_SESSION['oauth_provider'] = 'github';
$_SESSION['oauth_exists'] = $existingUser ? 'yes' : 'no';

header('Location: oauth_register.php');
exit;
