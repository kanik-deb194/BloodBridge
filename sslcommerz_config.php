<?php
/**
 * SSL Commerz Configuration
 * All credentials are loaded from .env — never hardcode them here.
 *
 * ── Sandbox Credentials (default) ──
 * Get yours at https://sandbox.sslcommerz.com
 *
 * ── Live Credentials ──
 * Set SSLCZ_SANDBOX=false in .env and use your live store credentials.
 */

$sslczSandboxEnv = $_ENV['SSLCZ_SANDBOX'] ?? 'true';
define('SSLCZ_SANDBOX', filter_var($sslczSandboxEnv, FILTER_VALIDATE_BOOLEAN));

/* ── Store Credentials ── */
if (SSLCZ_SANDBOX) {
    define('SSLCZ_STORE_ID',     $_ENV['SSLCZ_STORE_ID']     ?? '');
    define('SSLCZ_STORE_PASSWD', $_ENV['SSLCZ_STORE_PASSWD'] ?? '');
} else {
    define('SSLCZ_STORE_ID',     $_ENV['SSLCZ_LIVE_STORE_ID']     ?? '');
    define('SSLCZ_STORE_PASSWD', $_ENV['SSLCZ_LIVE_STORE_PASSWD'] ?? '');
}

/* ── API Endpoints ── */
define('SSLCZ_API_BASE', SSLCZ_SANDBOX
    ? 'https://sandbox.sslcommerz.com'
    : 'https://secure.sslcommerz.com'
);
define('SSLCZ_INIT_URL',       SSLCZ_API_BASE . '/gwprocess/v4/api.php');
define('SSLCZ_VALIDATION_URL', SSLCZ_API_BASE . '/validator/api/merchantTransIDvalidationAPI.php');

/* ── Callback Base URL ──
     Set SSLCZ_BASE_URL_OVERRIDE in .env for local ngrok testing.
     Leave it empty in .env for production (auto-detected from server).
  ── */
$sslczOverride = $_ENV['SSLCZ_BASE_URL_OVERRIDE'] ?? '';
define('SSLCZ_BASE_URL_OVERRIDE', $sslczOverride);

if (defined('SSLCZ_BASE_URL_OVERRIDE') && SSLCZ_BASE_URL_OVERRIDE !== '') {
    define('SSLCZ_BASE_URL', SSLCZ_BASE_URL_OVERRIDE);
} else {
    $sslczAutoUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
        . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost')
        . rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/') . '/';
    define('SSLCZ_BASE_URL', $sslczAutoUrl);
}

define('SSLCZ_IPN_URL',     SSLCZ_BASE_URL . 'sslcommerz_ipn.php');
define('SSLCZ_SUCCESS_URL', SSLCZ_BASE_URL . 'payment_success.php');
define('SSLCZ_CANCEL_URL',  SSLCZ_BASE_URL . 'payment_cancel.php');
define('SSLCZ_FAIL_URL',    SSLCZ_BASE_URL . 'payment_fail.php');

/* ── Currency ── */
define('SSLCZ_CURRENCY', 'BDT');