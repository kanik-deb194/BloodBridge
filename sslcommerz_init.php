<?php
/**
 * SSL Commerz Payment Initiation
 * Called via AJAX from the dashboard when requester clicks "Pay Now"
 * Returns { success, GatewayPageURL } or { success: false, error }
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sslcommerz_config.php';

if (!extension_loaded('curl')) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: PHP cURL extension is not enabled. Contact administrator.']);
    exit;
}

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

$uid = $_SESSION['user_id'] ?? null;
if (!$uid || !is_numeric($uid)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorised. Please log in.']);
    exit;
}
$uid = (int)$uid;

$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
$requestId = (int)($data['request_id'] ?? 0);
$bagId     = (int)($data['bag_id'] ?? 0);

if (!$requestId) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'request_id is required.']);
    exit;
}

/* ── Verify request belongs to this user and is approved ── */
$chk = $conn->query("
    SELECT id, status, request_type, payment_status
    FROM blood_request
    WHERE id = $requestId AND requester_user_id = $uid
    LIMIT 1
");
if (!$chk || !($req = $chk->fetch_assoc())) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Request not found.']);
    exit;
}

if ($req['status'] !== 'approved') {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Request is not yet approved.']);
    exit;
}

if ($req['payment_status'] === 'paid') {
    echo json_encode(['success' => false, 'error' => 'Payment already completed for this request.']);
    exit;
}

$requestType = $req['request_type'];
if (!in_array($requestType, ['paid', 'open'], true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Payment is not required for this request type.']);
    exit;
}

/* ── Ensure blood_culture_test has payment columns and backfill NULL prices ── */
$bctCols = []; $bctCr = $conn->query("SHOW COLUMNS FROM blood_culture_test");
if ($bctCr) { while ($c = $bctCr->fetch_assoc()) $bctCols[] = $c['Field']; }
if (!in_array('donor_price', $bctCols))
    $conn->query("ALTER TABLE blood_culture_test ADD COLUMN donor_price DECIMAL(10,2) NULL DEFAULT NULL AFTER status");
if (!in_array('price_accepted', $bctCols))
    $conn->query("ALTER TABLE blood_culture_test ADD COLUMN price_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER donor_price");
else
    $conn->query("UPDATE blood_culture_test SET price_accepted = 0 WHERE price_accepted IS NULL");

/* Backfill NULL donor_price for paid requests using requester's max_price_per_unit */
$conn->query("
    UPDATE blood_culture_test bct
    INNER JOIN blood_request br ON br.id = bct.request_id
    SET bct.donor_price = br.max_price_per_unit
    WHERE (bct.donor_price IS NULL OR bct.donor_price <= 0)
      AND br.request_type = 'paid'
      AND br.max_price_per_unit > 0
");

/* ── Calculate amount ── */
$amount = 0;
$donorName = '';
$donorUserId = null;

if ($bagId > 0) {
    /* Pay specific donor */
    $payRow = $conn->query("
        SELECT bct.donor_price, bct.donor_user_id, u.full_name
        FROM blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        INNER JOIN users u ON u.id = bct.donor_user_id
        WHERE bct.request_id = $requestId
          AND bb.id = $bagId
          AND bb.status = 'used'
          AND bct.price_accepted = 0
        LIMIT 1
    ");
    if (!$payRow || !($p = $payRow->fetch_assoc())) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Donor not found or already paid.']);
        exit;
    }
    $amount = (float)($p['donor_price'] ?? 0);
    $donorName = $p['full_name'];
    $donorUserId = (int)$p['donor_user_id'];
} else {
    /* Pay ALL accepted donors (sum of their prices) */
    $payRows = $conn->query("
        SELECT bct.donor_price, bct.donor_user_id, u.full_name
        FROM blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        INNER JOIN users u ON u.id = bct.donor_user_id
        WHERE bct.request_id = $requestId
          AND bb.status = 'used'
          AND bct.price_accepted = 0
    ");
    if ($payRows) {
        $names = [];
        while ($p = $payRows->fetch_assoc()) {
            $amount += (float)($p['donor_price'] ?? 0);
            $names[] = $p['full_name'];
        }
        $donorName = !empty($names) ? implode(', ', $names) : 'Donors';
    }
}

/* Debug log for payment troubleshooting */
$debugLog = date('Y-m-d H:i:s') . " | PAY: req=$requestId bag=$bagId amount=$amount uid=$uid\n";
if (isset($payRow) && $payRow) {
    $debugLog .= "  specific_bag_rows=" . $payRow->num_rows . "\n";
}
if (isset($payRows) && $payRows) {
    $debugLog .= "  all_bags_rows=" . $payRows->num_rows . "\n";
}
file_put_contents(__DIR__ . '/payment_ipn.log', $debugLog, FILE_APPEND | LOCK_EX);

if ($amount <= 0) {
    /* Free donation — mark as paid directly without SSL Commerz */
    $conn->query("
        UPDATE blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        SET bct.price_accepted = 1
        WHERE bct.request_id = $requestId
          AND bb.status = 'used'
          " . ($bagId > 0 ? "AND bb.id = $bagId" : "") . "
    ");
    $conn->query("UPDATE blood_request SET payment_status = 'paid', status = 'completed' WHERE id = $requestId");
    echo json_encode(['success' => true, 'free' => true, 'message' => 'Payment marked as completed.', 'payment_status' => 'paid', 'status' => 'completed']);
    exit;
}

/* ── Generate unique transaction ID ── */
$tranId = 'BLOOD' . $requestId . '_' . time() . '_' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));

/* ── Get requester info ── */
$uRow = $conn->query("SELECT full_name, email, phone FROM users WHERE id = $uid LIMIT 1");
$userInfo = $uRow ? $uRow->fetch_assoc() : [];
$custName  = $userInfo['full_name'] ?? 'Requester';
$custEmail = $userInfo['email'] ?? '';
$custPhone = $userInfo['phone'] ?? '';
$custAddr  = $userInfo['phone'] ?? '';

/* ── Insert transaction record (initiated) ── */
$conn->query("
    CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tran_id VARCHAR(100) NOT NULL UNIQUE,
        sessionkey VARCHAR(100) DEFAULT NULL,
        request_id INT NOT NULL,
        bag_id INT DEFAULT 0,
        requester_user_id INT NOT NULL,
        donor_user_id INT DEFAULT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'BDT',
        status ENUM('initiated','success','failed','cancelled') DEFAULT 'initiated',
        payment_method VARCHAR(50) DEFAULT NULL,
        card_issuer VARCHAR(100) DEFAULT NULL,
        card_brand VARCHAR(50) DEFAULT NULL,
        card_number VARCHAR(50) DEFAULT NULL,
        bank_tran_id VARCHAR(100) DEFAULT NULL,
        val_id VARCHAR(100) DEFAULT NULL,
        risk_level VARCHAR(20) DEFAULT NULL,
        risk_title VARCHAR(100) DEFAULT NULL,
        gw_version VARCHAR(10) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tran_id (tran_id),
        INDEX idx_request_id (request_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$dnName = $conn->real_escape_string($donorName);
$conn->query("
    INSERT INTO payment_transactions (tran_id, request_id, bag_id, requester_user_id, donor_user_id, amount, currency, status)
    VALUES ('$tranId', $requestId, $bagId, $uid, " . ($donorUserId ?: 'NULL') . ", $amount, 'BDT', 'initiated')
");

/* ── Build SSL Commerz request ── */
$postData = [
    'store_id'           => SSLCZ_STORE_ID,
    'store_passwd'       => SSLCZ_STORE_PASSWD,
    'total_amount'       => $amount,
    'currency'           => SSLCZ_CURRENCY,
    'tran_id'            => $tranId,
    'success_url'        => SSLCZ_SUCCESS_URL,
    'fail_url'           => SSLCZ_FAIL_URL,
    'cancel_url'         => SSLCZ_CANCEL_URL,
    'ipn_url'            => SSLCZ_IPN_URL,
    'cus_name'           => $custName,
    'cus_email'          => $custEmail,
    'cus_phone'          => $custPhone,
    'cus_add1'           => $custAddr,
    'cus_city'           => '',
    'cus_country'        => 'Bangladesh',
    'shipping_method'    => 'NO',
    'product_name'       => 'Blood Donation Payment',
    'product_category'   => 'Donation',
    'product_profile'    => 'non-physical-goods',
    'value_a'            => (string)$requestId,
    'value_b'            => (string)$bagId,
    'value_c'            => $dnName,
];

/* ── Send request to SSL Commerz ── */
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, SSLCZ_INIT_URL);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    $conn->query("UPDATE payment_transactions SET status = 'failed' WHERE tran_id = '$tranId'");
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Payment gateway connection failed: ' . $curlErr]);
    exit;
}

$result = json_decode($response, true);

if (!$result || !isset($result['status']) || $result['status'] !== 'SUCCESS') {
    $conn->query("UPDATE payment_transactions SET status = 'failed' WHERE tran_id = '$tranId'");
    $errMsg = $result['failedreason'] ?? ($result['msg'] ?? 'Payment initiation failed.');
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
}

/* ── Store session key ── */
$sessionKey = $conn->real_escape_string($result['sessionkey'] ?? '');
$conn->query("UPDATE payment_transactions SET sessionkey = '$sessionKey' WHERE tran_id = '$tranId'");

echo json_encode([
    'success'        => true,
    'GatewayPageURL' => $result['GatewayPageURL'] ?? '',
    'tran_id'        => $tranId,
    'amount'         => $amount,
]);
