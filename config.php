<?php

/**
 * Blood Bridge - Central Configuration
 * All database connections and global helpers
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('display_errors', 0);
ini_set('error_log', __DIR__ . '/php_errors.log');

/* ══════════════════════════════════════════════════════════
   ENV LOADER
   Reads .env from the project root and populates $_ENV.
   Call this once, right at the top, before anything else.
   ══════════════════════════════════════════════════════════ */
function loadEnv($path = null) {
    $envFile = $path ?? __DIR__ . '/.env';

    if (!file_exists($envFile)) {
        return; // No .env file — rely on system environment variables
    }

    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);

        // Skip comments and blank lines
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        // Must contain '='
        if (strpos($line, '=') === false) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);

        // Strip surrounding quotes (single or double)
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        // Only set if not already defined by the system environment
        if (!isset($_ENV[$key]) && !getenv($key)) {
            $_ENV[$key]  = $value;
            putenv("$key=$value");
        }
    }
}

// Load .env immediately — must run before DB connection below
loadEnv();

$host     = $_ENV['DB_HOST']     ?? 'localhost';
$user     = $_ENV['DB_USER']     ?? 'root';
$password = $_ENV['DB_PASSWORD'] ?? '';
$database = $_ENV['DB_NAME']     ?? 'blood_bridge';

try {
    $conn = new mysqli($host, $user, $password, $database);
    if ($conn->connect_error) {
        throw new Exception($conn->connect_error);
    }
} catch (Throwable $e) {
    if (isAjax()) {
        die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
    } else {
        die('Database connection failed: ' . $e->getMessage());
    }
}

$conn->set_charset("utf8mb4");

$conn->query("SET time_zone = '+06:00'");

function isAjax()
{
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

if (!function_exists('sendJson')) {
function sendJson($success, $message, $redirect = '', $extra = [])
{
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    header('Content-Type: application/json; charset=utf-8');
    $response = array_merge([
        'success' => $success,
        'message' => $message,
        'redirect' => $redirect
    ], $extra);
    echo json_encode($response);
    exit;
}
}

function isLoggedIn()
{
    return isset($_SESSION['user_id']) && isset($_SESSION['role']);
}

function requireLogin()
{
    if (!isLoggedIn()) {
        header('Location: login.html');
        exit;
    }
}

function getCurrentUser()
{
    if (!isLoggedIn()) return null;
    return [
        'id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'] ?? '',
        'email' => $_SESSION['user_email'] ?? '',
        'role' => $_SESSION['role'] ?? '',
        'sub_role' => $_SESSION['sub_role'] ?? ''
    ];
}

function logout()
{
    if (isset($_COOKIE['remember_token'])) {
        setcookie('remember_token', '', time() - 3600, '/');
        setcookie('remember_email', '', time() - 3600, '/');
    }

    $_SESSION = array();

    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time() - 3600, '/');
    }

    session_destroy();
}

function generateToken($length = 32)
{
    return bin2hex(random_bytes($length / 2));
}

function sanitize($conn, $input)
{
    return htmlspecialchars(strip_tags(trim($conn->real_escape_string($input))), ENT_QUOTES, 'UTF-8');
}

if (file_exists(__DIR__ . '/config_api.php')) {
    require_once __DIR__ . '/config_api.php';}

/**
 * Email validation — checks format, MX records, and blocks disposable domains.
 * Returns ['valid' => true] or ['valid' => false, 'message' => '...']
 */
function validateEmail($email) {
    // Ensure no PHP warnings/errors leak out
    $oldLevel = error_reporting(0);

    $email = trim($email);

    // Basic format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_reporting($oldLevel);
        return ['valid' => false, 'message' => 'Invalid email format.'];
    }

    // Extract domain
    $atPos = strpos($email, '@');
    if ($atPos === false || $atPos === 0 || $atPos === strlen($email) - 1) {
        error_reporting($oldLevel);
        return ['valid' => false, 'message' => 'Invalid email address.'];
    }
    $domain = strtolower(trim(substr($email, $atPos + 1)));

    if (empty($domain) || strpos($domain, '.') === false) {
        error_reporting($oldLevel);
        return ['valid' => false, 'message' => 'Email domain is invalid.'];
    }

    // ── Block disposable / temporary email domains ──
    $disposable = [
        'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
        'temp-mail.org','tempmail.org','throwaway.email','yopmail.com','yopmail.fr',
        'sharklasers.com','spam4.me','trashmail.com','trashmail.me','trashmail.net',
        '10minutemail.com','10minutemail.net','maildrop.cc','getairmail.com',
        'tempinbox.com','discard.email','discardmail.com','mailnator.com',
        'mailexpire.com','mailetc.com','mailmetrash.com','mintemail.com','nowmymail.com',
        'wegwerfmail.de','wegwerfmail.net','wegwerfmail.org','spambox.us','spambox.info',
        'thankyou2010.com','trash2009.com','trash-2009.com','trash2008.com',
        'maileater.com','dodgeit.com','mailcatch.com','e4ward.com','mytrashmail.com',
        'sogetthis.com','pookmail.com','binkmail.com','oopi.org','rtrtr.com',
        'chacuo.net','haltospam.com','jetable.org','kasmail.com','kaspop.com',
        'klassmaster.com','luxusmail.com','mailbidon.com','moakt.com','muchomail.com',
        'mycleaninbox.com','myopang.com','myrentway.com','mywarnet.net',
        'neverbox.com','nogmailspam.info','nomail.xl.cx','nomail2me.com','nospam4.us',
        'nospamfor.us','nospammail.net','receiveee.com','rejectmail.com','rklips.com',
        'saucemail.com','sendspamhere.com','sneakemail.com','spamfree24.org','spamgoes.in',
        'spamhereplease.com','spamlot.net','spamthisplease.com','supergreatmail.com',
        'thisisnotmyrealemail.com','tittbit.net','toxical.com','veryspeedy.net',
        'veryrealemail.com','xagloo.com','xemaps.com','xents.com','zippymail.info',
        'burnermail.io','tempmail.ninja','tmpmail.net','tmpeml.com','emailfake.com',
        'tempr.email','emailtempmail.com','mailtemp.net','tempemail.net','tempemail.co',
        'tempmailo.com','tempmail.dev','mail.tm','temp-mail.lol','emailondeck.com',
        'fakeinbox.com','mail1a.de','fexbox.com','mailel.com','mailboxy.fun',
        'fakemail.net','fakemailgenerator.com','fakemail.net','mailforspam.com',
        'mailimate.com','mailmetrash.com','mailnator.com','mailsac.com','mailshell.com',
        'mailtothis.com','mao2web.com','mt2009.com','mx0.com','my10minutemail.com',
        'mytrashmail.net','nervmich.net','netmails.com','netmails.net','netzidiot.de',
        'nevermail.de','no-spam.ws','nobulk.com','noclickemail.com','nokiamail.com',
        'nomail.pw','nomail.xl.cx','nomail2me.com','nospam4.us','nospamfor.us',
        'nospammail.net','nospamme.com','nowhere.org','oneoffemail.com','oneoffmail.com',
        'opayq.com','pcusers.otherinbox.com','petrzilka.net','pleft.com','poczta.onet.pl',
        'polbox.com','privacy.net','privy-mail.com','privymail.de','punkass.com',
        'put2.net','quickinbox.com','rcpt.at','receiveee.com','recipeforfailure.com',
        'regbypass.com','rejectmail.com','rma.in','robox.com','s0ny.net',
        'safetymail.info','sale.craigslist.org','saynotospams.com','selfdestructingmail.com',
        'sendspamhere.com','shorterurl.com','skeefmail.com','slaskpost.se','slopsbox.com',
        'snapwet.com','sneakemail.com','sneakmail.de','snkmail.com','softpls.asia',
        'sogetthis.com','sohus.cn','solar-impact.pro','solution4u.com','spam4.me',
        'spamail.de','spamarrest.com','spambe-gone.com','spambob.com','spambob.net',
        'spambob.org','spambog.net','spambog.ru','spambox.info','spambox.me',
        'spamcero.com','spamcorptastic.com','spamcowboy.com','spamcowboy.net',
        'spamcowboy.org','spamday.com','spamex.com','spamfree24.org','spamfree24.de',
        'spamgoes.in','spamgourmet.com','spamgourmet.net','spamgourmet.org',
        'spamhereplease.com','spamhole.com','spamify.com','spaminator.de','spamkill.info',
        'spaml.com','spaml.de','spammotel.com','spamobox.com','spamoff.de','spamsalad.in',
        'spamslicer.com','spamspameverywhere.tk','spamspot.com','spamstack.net',
        'spamthisplease.com','spamthis.co.uk','spamtrail.com','spamwc.de',
        'speedymail.org','spoofmail.de','stuffmail.de','suremail.info','techemail.com',
        'temp-mail.org','temp-mail.ru','tempemail.co.za','tempemail.net',
        'tempinbox.co.uk','tempinbox.com','tempmail.co','tempmail.it','tempmail.us',
        'tempmail2.com','tempmaildemo.com','tempmailer.com','tempmailer.de','temporaryforwarding.com',
        'temporaryinbox.com','temporarymail.org','thanksnospam.info','thanksnospam.net',
        'thankyou2010.com','thisisnotmyrealemail.com','throwawayemailaddress.com',
        'tittbit.net','tmail.ws','tmailinator.com','toiea.com','tokem.co',
        'topranklist.de','totalvista.com','trash2009.com','trash-2009.com','trashmail.com',
        'trashmail.net','trashmail.org','trashmail.ws','trashymail.com','trashymail.net',
        'tyldd.com','uggsrock.com','uu.gl','uujhs.com','venompen.com','veryrealemail.com',
        'viditag.com','vmailcloud.com','vmail.me','vp.ycare.de','vsimcard.com',
        'walala.org','wegwerfmail.de','wegwerfmail.net','wegwerfmail.org','wetrainbayarea.com',
        'wh4f.org','whyspam.me','willselfdestruct.com','winemaven.info','wronghead.com',
        'wuzup.net','xagloo.com','xemaps.com','xents.com','xmaily.com','xoxy.net',
        'yep.it','yogamaven.com','yopmail.com','yopmail.fr','yopmail.net','ypmail.webarnak.fr.eu.org',
        'yuurok.com','zehnminutenmail.de','zippymail.info','zoaxe.com','zoemail.org',
        'mail.tm','10minutemail.co.uk','10minutemail.com','20minutemail.com',
        '30minutemail.com','60minutemail.com','1chong.com','1mail.ml','1pad.de',
        '1st-forex.com','1to1mail.org','2nd-mail.xyz','2prong.com','3d-painting.com',
    ];

    if (in_array($domain, $disposable, true)) {
        error_reporting($oldLevel);
        return ['valid' => false, 'message' => 'Temporary email addresses are not allowed. Please use a real email.'];
    }

    // ── Check MX records ──
    $mxHosts = [];
    $mxWeight = [];
    $hasMx = false;
    if (function_exists('getmxrr')) {
        $hasMx = @getmxrr($domain, $mxHosts, $mxWeight) && !empty($mxHosts);
    }
    if (!$hasMx) {
        // Fallback: try A record
        $hasA = (function_exists('checkdnsrr') && @checkdnsrr($domain, 'A')) ||
                (function_exists('checkdnsrr') && @checkdnsrr($domain, 'AAAA'));
        if (!$hasA) {
            // Try gethostbyname as last resort
            $ip = @gethostbyname($domain);
            if ($ip === $domain) {
                error_reporting($oldLevel);
                return ['valid' => false, 'message' => 'Email domain does not exist. Please use a valid email address.'];
            }
        }
    }

    error_reporting($oldLevel);
    return ['valid' => true, 'message' => ''];
}

function calculateAge($dob) {
    if (empty($dob)) return 0;
    $birth = new DateTime($dob);
    $today = new DateTime();
    $diff = $today->diff($birth);
    return $diff->y;
}

/* ══════════════════════════════════════════════════════════
   THALASSEMIA COUPLE ALERT — sync engine
   Called whenever carrier status or partner link changes.
   ── Finds user's active partner from partner_links
   ── If both are carriers → UPSERT thalassemia_couple_alert
   ── If not both carriers → DELETE existing alert
   ── Pushes in-app notifications
   ══════════════════════════════════════════════════════════ */
function syncThalassemiaCoupleAlert($userId) {
    global $conn;
    if (!$conn || !$userId) return;

    // 1. Find active partner (user_id_1 < user_id_2 always)
    $stmt = $conn->prepare("
        SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END AS partner_id
        FROM partner_links
        WHERE status = 'active' AND (? IN (user_id_1, user_id_2))
        LIMIT 1
    ");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $link = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$link) {
        // No active partner → remove any alert where this user appears
        $stmt = $conn->prepare("
            DELETE FROM thalassemia_couple_alert
            WHERE (user_id_1 = ? OR user_id_2 = ?)
        ");
        $stmt->bind_param('ii', $userId, $userId);
        $stmt->execute();
        $stmt->close();
        return;
    }

    $partnerId = (int)$link['partner_id'];
    $id1 = min($userId, $partnerId);
    $id2 = max($userId, $partnerId);

    // 2. Get both carrier statuses
    $stmt = $conn->prepare("
        SELECT user_id, is_carrier FROM thalassemia_carrier
        WHERE user_id IN (?, ?)
    ");
    $stmt->bind_param('ii', $userId, $partnerId);
    $stmt->execute();
    $result = $stmt->get_result();
    $carriers = [];
    while ($row = $result->fetch_assoc()) {
        $carriers[(int)$row['user_id']] = (int)$row['is_carrier'];
    }
    $stmt->close();

    $uCarrier = isset($carriers[$userId]) ? $carriers[$userId] : 0;
    $pCarrier = isset($carriers[$partnerId]) ? $carriers[$partnerId] : 0;

    // 3. Generate or remove alert
    if ($uCarrier === 1 && $pCarrier === 1) {
        $advice = "Both you and your partner are identified as thalassemia carriers. "
                . "If both parents are carriers, there is a:\n"
                . "• 25% (1 in 4) chance of having a child with Thalassemia Major\n"
                . "• 50% (1 in 2) chance of having a child who is a carrier (like you)\n"
                . "• 25% (1 in 4) chance of having a child who is unaffected\n\n"
                . "We strongly recommend visiting a genetic counseling center for "
                . "detailed family planning guidance.";
        $stmt = $conn->prepare("
            INSERT INTO thalassemia_couple_alert (user_id_1, user_id_2, risk_percentage, advice)
            VALUES (?, ?, 25, ?)
            ON DUPLICATE KEY UPDATE risk_percentage = 25, advice = VALUES(advice)
        ");
        $stmt->bind_param('iis', $id1, $id2, $advice);
        $stmt->execute();
        $stmt->close();

        // Notify both users
        $title = '🧬 Thalassemia Couple Alert';
        $msg = 'Both you and your partner are thalassemia carriers. Please review the alert on your dashboard for genetic counseling information.';
        $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)");
        $stmt->bind_param('iss', $userId, $title, $msg);
        $stmt->execute();
        $stmt->bind_param('iss', $partnerId, $title, $msg);
        $stmt->execute();
        $stmt->close();
    } else {
        // One or both are not carriers → remove alert
        $stmt = $conn->prepare("
            DELETE FROM thalassemia_couple_alert
            WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        ");
        $stmt->bind_param('iiii', $id1, $id2, $id2, $id1);
        $stmt->execute();
        $stmt->close();
    }
}