<?php
/**
 * Payment Success Page
 * SSL Commerz redirects here after successful payment.
 * The IPN handler also runs server-to-server.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sslcommerz_config.php';

$tranId  = $_GET['tran_id'] ?? $_POST['tran_id'] ?? '';
$status  = $_GET['status'] ?? '';

/* Get transaction details */
$tran = null;
$requestId = 0;
if ($tranId) {
    $tRow = $conn->query("SELECT * FROM payment_transactions WHERE tran_id = '" . $conn->real_escape_string($tranId) . "' LIMIT 1");
    $tran = $tRow ? $tRow->fetch_assoc() : null;
    $requestId = (int)($tran['request_id'] ?? 0);

    /* If IPN hasn't processed yet, fallback: update DB + notify donors */
    if ($tran && $tran['status'] === 'initiated') {
        $bagId = (int)$tran['bag_id'];
        if ($bagId > 0) {
            $conn->query("
                UPDATE blood_culture_test bct
                INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
                SET bct.price_accepted = 1
                WHERE bct.request_id = $requestId AND bb.id = $bagId AND bb.status = 'used'
            ");
        } else {
            $conn->query("
                UPDATE blood_culture_test bct
                INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
                SET bct.price_accepted = 1
                WHERE bct.request_id = $requestId AND bb.status = 'used'
            ");
        }
        $conn->query("UPDATE blood_request SET payment_status = 'paid', status = 'completed' WHERE id = $requestId");
        $conn->query("UPDATE payment_transactions SET status = 'success' WHERE tran_id = '" . $conn->real_escape_string($tranId) . "'");

        /* Notify donors */
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
    }
}

$amount   = $tran['amount'] ?? 0;
$currency = $tran['currency'] ?? 'BDT';
?>
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Successful — BloodBridge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', sans-serif;
      background: #0a0a0f;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .bg-scene {
      position: fixed; inset: 0;
      overflow: hidden; pointer-events: none;
      z-index: 0;
    }
    .orb {
      position: absolute; border-radius: 50%;
      filter: blur(80px); opacity: .3;
      animation: orbFloat 12s ease-in-out infinite;
    }
    .orb-1 { width: 400px; height: 400px; background: #4ade80; top: -10%; left: -5%; }
    .orb-2 { width: 350px; height: 350px; background: #22d3ee; bottom: -15%; right: -5%; animation-delay: -4s; }
    .orb-3 { width: 250px; height: 250px; background: #fbbf24; top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -8s; }
    @keyframes orbFloat {
      0%,100% { transform: translate(0,0) scale(1); }
      33% { transform: translate(30px,-30px) scale(1.05); }
      66% { transform: translate(-20px,20px) scale(.95); }
    }
    .grid-overlay {
      position: fixed; inset: 0;
      background-image: linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: 1;
      pointer-events: none;
    }
    .card {
      position: relative; z-index: 2;
      background: rgba(255,255,255,.04);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 24px;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 24px 80px rgba(0,0,0,.5);
      animation: cardIn .6s ease-out;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(30px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .icon-check {
      width: 80px; height: 80px;
      background: rgba(74,222,128,.12);
      border: 2px solid rgba(74,222,128,.3);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
      animation: pulseCheck 1.5s ease-in-out infinite;
    }
    @keyframes pulseCheck {
      0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,.3); }
      50% { box-shadow: 0 0 0 16px rgba(74,222,128,0); }
    }
    h1 {
      color: #4ade80;
      font-size: 1.6rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .subtitle {
      color: rgba(255,255,255,.5);
      font-size: .9rem;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .details {
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 28px;
      text-align: left;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,.04);
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label {
      color: rgba(255,255,255,.4);
      font-size: .78rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .detail-value {
      color: rgba(255,255,255,.9);
      font-size: .9rem;
      font-weight: 600;
    }
    .detail-value.amount {
      color: #fbbf24;
      font-size: 1.1rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      border-radius: 50px;
      font-size: .9rem;
      font-weight: 600;
      font-family: 'Outfit', sans-serif;
      text-decoration: none;
      cursor: pointer;
      transition: all .25s;
      border: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4ade80, #22d3ee);
      color: #0a0a0f;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(74,222,128,.3);
    }
    .btn-secondary {
      background: rgba(255,255,255,.06);
      color: rgba(255,255,255,.7);
      border: 1px solid rgba(255,255,255,.1);
      margin-left: 10px;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,.1);
    }
    .footer-text {
      margin-top: 20px;
      font-size: .72rem;
      color: rgba(255,255,255,.25);
    }
    .footer-text a {
      color: rgba(74,222,128,.5);
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="bg-scene">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <div class="grid-overlay"></div>

  <div class="card">
    <div class="icon-check">✅</div>
    <h1>Payment Successful! 🎉</h1>
    <p class="subtitle">Your payment has been processed successfully. The donor has been notified and your request is now marked as completed.</p>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Transaction ID</span>
        <span class="detail-value" style="font-family:monospace;font-size:.78rem;"><?= htmlspecialchars($tranId) ?></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount Paid</span>
        <span class="detail-value amount"><?= $currency ?> <?= number_format($amount, 2) ?></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Method</span>
        <span class="detail-value">SSL Commerz</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value" style="color:#4ade80;">Completed ✅</span>
      </div>
    </div>

    <div>
      <a href="donor_recipient_dash.html" class="btn btn-primary">🏠 Back to Dashboard</a>
      <a href="donor_recipient_dash.html#myRequests" class="btn btn-secondary">📋 View My Requests</a>
    </div>

    <div class="footer-text">
      <p>BloodBridge — Saving lives, one donation at a time.</p>
      <p style="margin-top:4px;"><a href="privacy.php">Privacy Policy</a> &bull; <a href="terms.php">Terms of Service</a></p>
    </div>
  </div>
</body>
</html>
