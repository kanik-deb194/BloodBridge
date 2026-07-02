<?php

// PHPMailer SMTP Configuration
// For Gmail: use smtp.gmail.com, port 587, TLS
// You MUST use a Gmail App Password (not your regular password)
// Generate one at: https://myaccount.google.com/apppasswords

define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_ENCRYPTION', 'tls');
define('SMTP_USERNAME', 'rk3712309@gmail.com');
define('SMTP_PASSWORD', 'uhmxndqynkltefbi');
define('SMTP_FROM_EMAIL', 'rk3712309@gmail.com');
define('SMTP_FROM_NAME', 'BloodBridge');

require_once __DIR__ . '/vendor/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/src/SMTP.php';
require_once __DIR__ . '/vendor/phpmailer/src/Exception.php';

function sendMail($to, $subject, $htmlBody) {
    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USERNAME;
        $mail->Password   = SMTP_PASSWORD;
        $mail->SMTPSecure = SMTP_ENCRYPTION;
        $mail->Port       = SMTP_PORT;

        $mail->CharSet = 'UTF-8';
        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Mail error: " . $e->getMessage());
        return false;
    }
}
