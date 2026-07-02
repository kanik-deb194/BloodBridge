<?php
/**
 * Blood Bridge - OAuth Configuration
 * All credentials are loaded from .env — never hardcode them here.
 *
 * INSTRUCTIONS TO SET UP GOOGLE LOGIN:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Go to "APIs & Services" > "Credentials"
 * 4. Click "Create Credentials" > "OAuth client ID"
 * 5. Select "Web application"
 * 6. Add authorized redirect URI: http://localhost/blood_bridge/google_callback.php
 * 7. Copy Client ID and Client Secret to your .env file
 *
 * INSTRUCTIONS TO SET UP GITHUB LOGIN:
 * 1. Go to https://github.com/settings/developers
 * 2. Click "New OAuth App"
 * 3. Fill in application name and description
 * 4. Set Authorization callback URL: http://localhost/Blood_Merged/Final_Updated_Blood_Bridge/github_callback.php
 * 5. Copy Client ID and Client Secret to your .env file
 */

// Google OAuth2 Settings
$googleConfig = [
    'client_id'     => $_ENV['GOOGLE_CLIENT_ID']     ?? '',
    'client_secret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'enabled'       => true
];

// GitHub OAuth2 Settings
$githubConfig = [
    'client_id'     => $_ENV['GITHUB_CLIENT_ID']     ?? '',
    'client_secret' => $_ENV['GITHUB_CLIENT_SECRET'] ?? '',
    'enabled'       => true
];

/**
 * Override base URL for OAuth redirect URIs.
 * Set OAUTH_BASE_URL in your .env file.
 * When testing via ngrok, update the value there.
 * IMPORTANT: The callback URLs must also be registered in Google/GitHub OAuth consoles.
 */
define('OAUTH_BASE_URL', $_ENV['OAUTH_BASE_URL'] ?? '');

// Helper function to check if OAuth is configured
function isOAuthConfigured($provider) {
    global $googleConfig, $githubConfig;

    if ($provider === 'google') {
        return $googleConfig['enabled'] &&
               !empty($googleConfig['client_id']) &&
               $googleConfig['client_id'] !== 'YOUR_GOOGLE_CLIENT_ID_HERE';
    }

    if ($provider === 'github') {
        return $githubConfig['enabled'] &&
               !empty($githubConfig['client_id']) &&
               $githubConfig['client_id'] !== 'YOUR_GITHUB_CLIENT_ID_HERE';
    }

    return false;
}

// Get redirect URI
function getOAuthRedirectUri($provider) {
    if (defined('OAUTH_BASE_URL') && !empty(OAUTH_BASE_URL)) {
        $base = rtrim(OAUTH_BASE_URL, '/');
        return $base . '/' . $provider . '_callback.php';
    }
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $path = dirname($_SERVER['PHP_SELF']);

    // Normalize path to avoid double slashes and ensure it ends without trailing slash
    $path = rtrim($path, '/\\');

    return $protocol . '://' . $host . $path . '/' . $provider . '_callback.php';
}