<?php
session_start();
require_once 'oauth_config.php';

if (!isOAuthConfigured('google')) {
    header('Location: login.html?error=' . urlencode('Google OAuth is not configured. Please set up credentials in oauth_config.php'));
    exit;
}

$clientId = $googleConfig['client_id'];
$clientSecret = $googleConfig['client_secret'];
$redirectUri = getOAuthRedirectUri('google');

// Google OAuth2 endpoints
$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
$scope = 'openid email profile';

// Generate state parameter for security
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;

// Build authorization URL
$params = [
    'client_id' => $clientId,
    'redirect_uri' => $redirectUri,
    'response_type' => 'code',
    'scope' => $scope,
    'state' => $state,
    'access_type' => 'offline',
    'prompt' => 'consent'
];

$authUrl .= '?' . http_build_query($params);

header('Location: ' . $authUrl);
exit;
