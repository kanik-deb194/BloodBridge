<?php
session_start();
require_once 'oauth_config.php';

if (!isOAuthConfigured('github')) {
    header('Location: login.html?error=' . urlencode('GitHub OAuth is not configured. Please set up credentials in oauth_config.php'));
    exit;
}

$clientId = $githubConfig['client_id'];
$clientSecret = $githubConfig['client_secret'];
$redirectUri = getOAuthRedirectUri('github');

// GitHub OAuth2 endpoints
$authUrl = 'https://github.com/login/oauth/authorize';
$scope = 'user:email';

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
    'allow_signup' => 'true',
    'prompt' => 'consent'
];

$authUrl .= '?' . http_build_query($params);

header('Location: ' . $authUrl);
exit;
