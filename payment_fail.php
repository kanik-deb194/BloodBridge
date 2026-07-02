<?php
/**
 * Payment Fail Page
 * SSL Commerz redirects here if the payment fails.
 */

require_once __DIR__ . '/config.php';

$tranId = $_GET['tran_id'] ?? $_POST['tran_id'] ?? '';
$error  = $_GET['error'] ?? '';

/* Update transaction status if found */
if ($tranId) {
    $conn->query("UPDATE payment_transactions SET status = 'failed' WHERE tran_id = '" . $conn->real_escape_string($tranId) . "' AND status = 'initiated'");
}
?>
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Failed — BloodBridge</title>
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
      filter: blur(80px); opacity: .2;
      animation: orbFloat 12s ease-in-out infinite;
    }
    .orb-1 { width: 400px; height: 400px; background: #f87171; top: -10%; left: -5%; }
    .orb-2 { width: 350px; height: 350px; background: #fbbf24; bottom: -15%; right: -5%; animation-delay: -4s; }
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
    .icon-fail {
      width: 80px; height: 80px;
      background: rgba(239,68,68,.12);
      border: 2px solid rgba(239,68,68,.3);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
    }
    h1 {
      color: #f87171;
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
    .error-box {
      background: rgba(239,68,68,.06);
      border: 1px solid rgba(239,68,68,.2);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
      font-size: .82rem;
      color: #fca5a5;
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
      margin-top: 10px;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,.1);
    }
    .footer-text {
      margin-top: 20px;
      font-size: .72rem;
      color: rgba(255,255,255,.25);
    }
  </style>
</head>
<body>
  <div class="bg-scene">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
  </div>
  <div class="grid-overlay"></div>

  <div class="card">
    <div class="icon-fail">❌</div>
    <h1>Payment Failed</h1>
    <p class="subtitle">We couldn't process your payment. Your request is still saved — no charges have been made.</p>

    <?php if ($error): ?>
    <div class="error-box"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div>
      <a href="donor_recipient_dash.html" class="btn btn-primary">🏠 Back to Dashboard</a>
      <br>
      <a href="javascript:history.back()" class="btn btn-secondary">🔄 Try Again</a>
    </div>

    <div class="footer-text">
      <p>BloodBridge — If the issue persists, please try a different payment method.</p>
    </div>
  </div>
</body>
</html>
