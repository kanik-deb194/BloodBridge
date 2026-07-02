<?php
/**
 * SSL Commerz IPN (Instant Payment Notification) Handler
 *
 * Called by SSL Commerz server after payment is completed/failed/cancelled.
 * This is a server-to-server call. No session/auth needed — SSL Commerz
 * sends the transaction data directly.
 *
 * We validate the transaction using the SSL Commerz Validation API
 * and update the database accordingly.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sslcommerz_config.php';

if (!extension_loaded('curl')) {
    http_response_code(500);
    file_put_contents(__DIR__ . '/payment_ipn.log', date('Y-m-d H:i:s') . " | ERROR: cURL extension not loaded\n", FILE_APPEND | LOCK_EX);
    exit;
}

/* Log the IPN request for debugging */
$logFile = __DIR__ . '/payment_ipn.log';
$logData = date('Y-m-d H:i:s') . ' | IPN received' . "\n";
foreach ($_POST as $k => $v) {
    $logData .= "  $k: $v\n";
}
file_put_contents($logFile, $logData, FILE_APPEND | LOCK_EX);

/* ── Get transaction data from SSL Commerz POST ── */
$tranId       = $_POST['tran_id']       ?? '';
$valId        = $_POST['val_id']        ?? '';
$status       = $_POST['status']        ?? '';
$bankTranId   = $_POST['bank_tran_id']  ?? '';
$paymentMethod = $_POST['card_type']    ?? '';
$cardIssuer   = $_POST['card_issuer']   ?? '';
$cardBrand    = $_POST['card_brand']    ?? '';
$cardNumber   = $_POST['card_no']       ?? '';
$riskLevel    = $_POST['risk_level']    ?? '';
$riskTitle    = $_POST['risk_title']    ?? '';
$gwVersion    = $_POST['gw_version']    ?? '';
$amount       = (float)($_POST['amount'] ?? 0);

if (empty($tranId) || empty($valId)) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: Missing tran_id or val_id\n", FILE_APPEND | LOCK_EX);
    http_response_code(400);
    exit;
}

/* ── Validate transaction via SSL Commerz API ── */
$validationUrl = SSLCZ_VALIDATION_URL . '?val_id=' . urlencode($valId)
    . '&store_id=' . urlencode(SSLCZ_STORE_ID)
    . '&store_passwd=' . urlencode(SSLCZ_STORE_PASSWD)
    . '&v=1&format=json';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $validationUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$validationResponse = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: Validation cURL failed: $curlErr\n", FILE_APPEND | LOCK_EX);
    http_response_code(502);
    exit;
}

$validationResult = json_decode($validationResponse, true);

if (!$validationResult || !isset($validationResult['status'])) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: Invalid validation response\n", FILE_APPEND | LOCK_EX);
    http_response_code(502);
    exit;
}

$isValid = ($validationResult['status'] === 'VALID' || $validationResult['status'] === 'VALIDATED');

if (!$isValid) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: Validation API rejected transaction $tranId (status: {$validationResult['status']})\n", FILE_APPEND | LOCK_EX);
    /* Still mark as failed in DB if transaction exists */
    $conn->query("UPDATE payment_transactions SET status = 'failed' WHERE tran_id = '" . $conn->real_escape_string($tranId) . "' AND status = 'initiated'");
    http_response_code(200);
    echo 'IPN processed (validation failed)';
    exit;
}

/* ── Look up transaction in our database ── */
$tRow = $conn->query("SELECT * FROM payment_transactions WHERE tran_id = '" . $conn->real_escape_string($tranId) . "' LIMIT 1");
$tran = $tRow ? $tRow->fetch_assoc() : null;

if (!$tran) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " | ERROR: Transaction not found: $tranId\n", FILE_APPEND | LOCK_EX);
    http_response_code(404);
    exit;
}

$requestId = (int)$tran['request_id'];
$bagId     = (int)$tran['bag_id'];

/* ── Update transaction record ── */
$newStatus = 'success';
$pmEsc = $conn->real_escape_string($paymentMethod);
$ciEsc = $conn->real_escape_string($cardIssuer);
$cbEsc = $conn->real_escape_string($cardBrand);
$cnEsc = $conn->real_escape_string($cardNumber);
$btEsc = $conn->real_escape_string($bankTranId);
$vEsc  = $conn->real_escape_string($valId);
$rlEsc = $conn->real_escape_string($riskLevel);
$rtEsc = $conn->real_escape_string($riskTitle);
$gwEsc = $conn->real_escape_string($gwVersion);

$conn->query("
    UPDATE payment_transactions
    SET status = '$newStatus',
        payment_method = '$pmEsc',
        card_issuer = '$ciEsc',
        card_brand = '$cbEsc',
        card_number = '$cnEsc',
        bank_tran_id = '$btEsc',
        val_id = '$vEsc',
        risk_level = '$rlEsc',
        risk_title = '$rtEsc',
        gw_version = '$gwEsc'
    WHERE tran_id = '$tranId'
");

/* ── Validation passed — update the donation records ── */
if ($bagId > 0) {
    /* Mark specific donor as paid */
    $conn->query("
        UPDATE blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        SET bct.price_accepted = 1
        WHERE bct.request_id = $requestId
          AND bb.id = $bagId
          AND bb.status = 'used'
    ");
} else {
    /* Mark ALL accepted donors as paid */
    $conn->query("
        UPDATE blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        SET bct.price_accepted = 1
        WHERE bct.request_id = $requestId
          AND bb.status = 'used'
    ");
}

/* Update request payment status and mark as completed */
$conn->query("UPDATE blood_request SET payment_status = 'paid', status = 'completed' WHERE id = $requestId");

/* Notify donors who were just paid */
$reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);
$paidDonors = $conn->query("
    SELECT DISTINCT bct.donor_user_id, u.full_name
    FROM blood_culture_test bct
    INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
    INNER JOIN users u ON u.id = bct.donor_user_id
    WHERE bct.request_id = $requestId
      AND bb.status = 'used'
      AND bct.price_accepted = 1
");
if ($paidDonors) {
    while ($pd = $paidDonors->fetch_assoc()) {
        $did = (int)$pd['donor_user_id'];
        $conn->query("INSERT INTO notification (user_id, title, message)
            VALUES ($did, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-$reqNo via SSL Commerz.')");
    }
}

file_put_contents($logFile, date('Y-m-d H:i:s') . " | SUCCESS: Payment completed for tran_id=$tranId, request_id=$requestId\n", FILE_APPEND | LOCK_EX);

http_response_code(200);
echo 'IPN processed successfully';
