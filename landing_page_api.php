<?php

/**
 * BloodBridge Landing Page API
 * Returns live stats from the database as JSON
 * Place this file in your project root (same folder as landing_page.html)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache, must-revalidate');

// Database config — adjust if your XAMPP credentials differ
$db_host = 'localhost';
$db_name = 'blood_bridge';
$db_user = 'root';
$db_pass = '';

$response = ['success' => false, 'data' => [], 'timestamp' => date('Y-m-d H:i:s')];

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $data = [];

    // 1. Total active donors
    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'donor_recipient' AND is_active = 1");
    $data['total_donors'] = (int) $stmt->fetchColumn();

    // 2. Total active blood banks
    $stmt = $pdo->query("SELECT COUNT(*) FROM blood_bank WHERE status = 'active'");
    $data['total_banks'] = (int) $stmt->fetchColumn();

    // 3. Total completed donations & lives saved (1 donation = 3 lives)
    $stmt = $pdo->query("SELECT COUNT(*) FROM donation WHERE status = 'completed'");
    $total_donations = (int) $stmt->fetchColumn();
    $data['total_donations'] = $total_donations;
    $data['total_lives_saved'] = $total_donations * 3;

    // 4. Blood stock by group (from view)
    $stmt = $pdo->query("SELECT blood_group, SUM(units_available) as units FROM vw_available_stock GROUP BY blood_group");
    $blood_stock = [];
    $all_groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    foreach ($all_groups as $g) $blood_stock[$g] = 0;
    while ($row = $stmt->fetch()) {
        $blood_stock[$row['blood_group']] = (int) $row['units'];
    }
    $data['blood_stock'] = $blood_stock;

    // 5. Critical / urgent pending requests
    $stmt = $pdo->query("SELECT COUNT(*) FROM blood_request WHERE urgency = 'critical' AND status IN ('pending','pending_approval')");
    $data['urgent_requests'] = (int) $stmt->fetchColumn();

    // 6. Total pending requests
    $stmt = $pdo->query("SELECT COUNT(*) FROM blood_request WHERE status IN ('pending','pending_approval')");
    $data['pending_requests'] = (int) $stmt->fetchColumn();

    // 7. Blood bags expiring within 7 days
    $stmt = $pdo->query("SELECT COUNT(*) FROM vw_expiring_soon");
    $data['expiring_soon'] = (int) $stmt->fetchColumn();

    // 8. Active temperature alerts (last hour)
    $stmt = $pdo->query("SELECT COUNT(DISTINCT sensor_id) FROM vw_temperature_alert_summary WHERE alert_type != 'NORMAL' AND recorded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)");
    $data['temp_alerts'] = (int) $stmt->fetchColumn();

    // 9. Recent emergency requests (for ticker)
    $stmt = $pdo->query("SELECT extracted_blood_group, extracted_location, requester_phone, created_at FROM emergency_request WHERE status = 'pending' ORDER BY created_at DESC LIMIT 6");
    $data['emergency_requests'] = $stmt->fetchAll();

    // 10. Recent blood requests (for ticker fallback)
    $stmt = $pdo->query("SELECT blood_group, units_required, urgency, requested_at FROM blood_request WHERE status IN ('pending','pending_approval') ORDER BY requested_at DESC LIMIT 6");
    $data['recent_requests'] = $stmt->fetchAll();

    // 11. Top rated blood bank
    $stmt = $pdo->query("SELECT name, rating_avg FROM blood_bank WHERE status = 'active' ORDER BY rating_avg DESC LIMIT 1");
    $data['top_bank'] = $stmt->fetch();

    // 12. Family with most donations
    $stmt = $pdo->query("SELECT family_name, total_donations, total_lives_saved FROM family_legacy ORDER BY total_donations DESC LIMIT 1");
    $data['top_family'] = $stmt->fetch();

    $response['success'] = true;
    $response['data'] = $data;
} catch (PDOException $e) {
    $response['error'] = 'Database connection failed. Please ensure XAMPP MySQL is running.';
    $response['debug'] = $e->getMessage();
    $response['data'] = [
        'total_donors' => 0,
        'total_banks' => 0,
        'total_donations' => 0,
        'total_lives_saved' => 0,
        'blood_stock' => ['A+' => 0, 'A-' => 0, 'B+' => 0, 'B-' => 0, 'O+' => 0, 'O-' => 0, 'AB+' => 0, 'AB-' => 0],
        'urgent_requests' => 0,
        'pending_requests' => 0,
        'expiring_soon' => 0,
        'temp_alerts' => 0,
        'emergency_requests' => [],
        'recent_requests' => [],
        'top_bank' => null,
        'top_family' => null
    ];
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);
