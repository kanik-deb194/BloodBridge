<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

if (ob_get_level()) ob_end_clean();
ob_start();

session_start();
require_once __DIR__ . '/config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function jR($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireDelivery() {
    $uid     = $_SESSION['user_id']  ?? null;
    $role    = $_SESSION['role']     ?? null;
    $subRole = $_SESSION['sub_role'] ?? null;
    $ok = ($uid !== null && is_numeric($uid)) &&
          ($role === 'delivery_staff' ||
           ($role === 'user' && $subRole === 'delivery_staff'));
    if ($ok) return (int)$uid;
    jR(['success'=>false,'error'=>'Unauthorised. Please log in.'], 401);
}

if (!$conn || $conn->connect_error) {
    jR(['success'=>false,'error'=>'Database connection failed.'], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {

    /* ══════════════════════════════════════════════
       DASHBOARD STATS
       JS expects: staff_name, assigned_zone,
         active_deliveries, escort_requests,
         completed_today
    ══════════════════════════════════════════════ */
    case 'dashboard_stats': {
        $uid = requireDelivery();

        /* Get user + delivery_staff info */
        $stmt = $conn->prepare("
            SELECT u.id, u.full_name, u.email, u.phone,
                   u.blood_bank_id,
                   bb.name  AS blood_bank_name,
                   ds.assigned_zone, ds.vehicle_type, ds.license_no
            FROM users u
            LEFT JOIN blood_bank    bb ON bb.id = u.blood_bank_id
            LEFT JOIN delivery_staff ds ON ds.user_id = u.id
            WHERE u.id = ? LIMIT 1
        ");
        $stmt->bind_param('i', $uid); $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc(); $stmt->close();
        if (!$user) jR(['success'=>false,'error'=>'User not found.'], 404);

        $bankId      = (int)($user['blood_bank_id'] ?? 0);
        $bankFilter  = $bankId ? " AND br.blood_bank_id = $bankId" : '';

        /* active_deliveries = escort + drone requests in progress */
        $r = $conn->query("
            SELECT COUNT(*) AS c FROM blood_request br
            WHERE br.status IN ('approved','dispatched','in_transit')
            $bankFilter
        ");
        $activeDeliveries = (int)($r ? $r->fetch_assoc()['c'] : 0);

        /* escort_requests = pending donor_escort_request */
        $bankEscortFilter = $bankId ? " AND blood_bank_id = $bankId" : '';
        $r = $conn->query("
            SELECT COUNT(*) AS c FROM donor_escort_request
            WHERE status = 'pending' $bankEscortFilter
        ");
        $escortRequests = (int)($r ? $r->fetch_assoc()['c'] : 0);

        /* completed_today */
        $r = $conn->query("
            SELECT COUNT(*) AS c FROM blood_request br
            WHERE br.status = 'delivered'
            AND DATE(br.delivered_at) = CURDATE()
            $bankFilter
        ");
        $completedToday = (int)($r ? $r->fetch_assoc()['c'] : 0);

        jR([
            'success'           => true,
            'staff_name'        => $user['full_name']       ?? 'Staff',
            'assigned_zone'     => $user['assigned_zone']   ?? 'N/A',
            'vehicle_type'      => $user['vehicle_type']    ?? '',
            'license_no'        => $user['license_no']      ?? '',
            'bank_name'         => $user['blood_bank_name'] ?? 'BloodBridge',
            'active_deliveries' => $activeDeliveries,
            'escort_requests'   => $escortRequests,
            'completed_today'   => $completedToday,
        ]);
        break;
    }

    /* ══════════════════════════════════════════════
       ACTIVE DELIVERIES
       JS expects array: deliveries[]
         delivery_id, destination, blood_group,
         units_required, status, eta, id
    ══════════════════════════════════════════════ */
    case 'active_deliveries': {
        $uid = requireDelivery();
        $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
        $stmt->bind_param('i', $uid); $stmt->execute();
        $bankId = (int)($stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? 0); $stmt->close();

        $bankFilter = $bankId ? " AND br.blood_bank_id = $bankId" : '';

        $r = $conn->query("
            SELECT br.id,
                   CONCAT('REQ-', LPAD(br.id, 4, '0')) AS delivery_id,
                   COALESCE(bb.name, 'Unknown') AS destination,
                   br.blood_group,
                   br.units_required,
                   br.status,
                   br.delivery_method,
                   COALESCE(br.required_by, DATE_ADD(br.requested_at, INTERVAL 2 HOUR)) AS eta
            FROM blood_request br
            LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
            WHERE br.status IN ('approved','dispatched','in_transit')
            $bankFilter
            ORDER BY br.requested_at DESC
            LIMIT 50
        ");
        $deliveries = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

        /* format eta */
        foreach ($deliveries as &$d) {
            $d['eta'] = $d['eta'] ? date('M j, g:i A', strtotime($d['eta'])) : 'TBD';
        }
        unset($d);

        jR(['success'=>true, 'deliveries'=>$deliveries]);
        break;
    }

    /* ══════════════════════════════════════════════
       ESCORT REQUESTS
       JS expects array: escorts[]
         id, escort_id, donor_name, donor_gender,
         pickup_address, preferred_time,
         dropoff_location, status
    ══════════════════════════════════════════════ */
    case 'escort_requests': {
        $uid = requireDelivery();
        $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
        $stmt->bind_param('i', $uid); $stmt->execute();
        $bankId = (int)($stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? 0); $stmt->close();

        $bankFilter = $bankId ? " AND er.blood_bank_id = $bankId" : '';

        $r = $conn->query("
            SELECT er.id,
                   CONCAT('ER-', LPAD(er.id, 3, '0')) AS escort_id,
                   u.full_name  AS donor_name,
                   er.preferred_gender AS donor_gender,
                   er.pickup_address,
                   er.preferred_time,
                   bb.name      AS dropoff_location,
                   er.status
            FROM donor_escort_request er
            LEFT JOIN users      u  ON u.id  = er.donor_user_id
            LEFT JOIN blood_bank bb ON bb.id = er.blood_bank_id
            WHERE er.status IN ('pending','accepted','in_progress')
            $bankFilter
            ORDER BY er.preferred_time ASC
            LIMIT 50
        ");
        $escorts = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

        jR(['success'=>true, 'escorts'=>$escorts]);
        break;
    }

    /* ══════════════════════════════════════════════
       DRONE DISPATCHES
       JS expects array: drones[]
         id, dispatch_id, drone_model, destination,
         blood_group, units_required, status,
         estimated_arrival
    ══════════════════════════════════════════════ */
    case 'drone_dispatches': {
        requireDelivery();

        $r = $conn->query("
            SELECT dd.id,
                   CONCAT('DD-', LPAD(dd.id, 3, '0'))  AS dispatch_id,
                   dr.drone_code                         AS drone_model,
                   dr.drone_code,
                   dr.battery_level,
                   COALESCE(bb.name, 'Unknown')          AS destination,
                   br.blood_group,
                   br.units_required,
                   dd.status,
                   dd.estimated_arrival,
                   dd.actual_arrival,
                   dd.created_at
            FROM drone_dispatch dd
            INNER JOIN drone         dr ON dr.id  = dd.drone_id
            INNER JOIN blood_request br ON br.id  = dd.blood_request_id
            LEFT JOIN  blood_bank    bb ON bb.id  = dd.source_bank_id
            ORDER BY dd.created_at DESC
            LIMIT 100
        ");
        $drones = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

        jR(['success'=>true, 'drones'=>$drones]);
        break;
    }

    /* ══════════════════════════════════════════════
       STAFF PROFILE
       JS expects: profile{}
         full_name, email, phone, assigned_zone,
         vehicle_type, license_no
    ══════════════════════════════════════════════ */
    case 'staff_profile': {
        $uid = requireDelivery();
        $stmt = $conn->prepare("
            SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
                   bb.name  AS blood_bank_name,
                   ds.assigned_zone, ds.vehicle_type, ds.license_no
            FROM users u
            LEFT JOIN blood_bank    bb ON bb.id = u.blood_bank_id
            LEFT JOIN delivery_staff ds ON ds.user_id = u.id
            WHERE u.id = ? LIMIT 1
        ");
        $stmt->bind_param('i', $uid); $stmt->execute();
        $profile = $stmt->get_result()->fetch_assoc(); $stmt->close();
        if (!$profile) jR(['success'=>false,'error'=>'Profile not found.'], 404);
        jR(['success'=>true, 'profile'=>$profile]);
        break;
    }

    /* ══════════════════════════════════════════════
       COMPLETED DELIVERIES
       JS expects array: completed[]
         delivery_id, destination, blood_group,
         units_required, delivered_at
    ══════════════════════════════════════════════ */
    case 'completed_deliveries': {
        $uid = requireDelivery();
        $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
        $stmt->bind_param('i', $uid); $stmt->execute();
        $bankId = (int)($stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? 0); $stmt->close();

        $bankFilter = $bankId ? " AND br.blood_bank_id = $bankId" : '';

        $r = $conn->query("
            SELECT br.id,
                   CONCAT('REQ-', LPAD(br.id, 4, '0')) AS delivery_id,
                   COALESCE(bb.name, 'Unknown') AS destination,
                   br.blood_group,
                   br.units_required,
                   br.delivered_at
            FROM blood_request br
            LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
            WHERE br.status = 'delivered'
            AND DATE(br.delivered_at) = CURDATE()
            $bankFilter
            ORDER BY br.delivered_at DESC
            LIMIT 100
        ");
        $completed = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

        jR(['success'=>true, 'completed'=>$completed]);
        break;
    }

    /* ══════════════════════════════════════════════
       CONFIRM DELIVERY
    ══════════════════════════════════════════════ */
    case 'confirm_delivery': {
        $uid  = requireDelivery();
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $requestId   = (int)($data['request_id']   ?? 0);
        $deliveryNote= trim($data['delivery_note'] ?? '');
        if (!$requestId) jR(['success'=>false,'error'=>'Request ID required.'], 422);

        $stmt = $conn->prepare("
            UPDATE blood_request
            SET status='delivered', delivered_at=NOW()
            WHERE id=? AND status IN ('approved','dispatched','in_transit')
        ");
        $stmt->bind_param('i', $requestId);
        if (!$stmt->execute()) jR(['success'=>false,'error'=>'Update failed: '.$conn->error], 500);
        if ($stmt->affected_rows === 0) jR(['success'=>false,'error'=>'Request not found or already delivered.'], 404);
        $stmt->close();
        jR(['success'=>true, 'message'=>'Delivery confirmed.']);
        break;
    }

    /* ══════════════════════════════════════════════
       UPDATE ESCORT STATUS
    ══════════════════════════════════════════════ */
    case 'update_escort': {
        $uid  = requireDelivery();
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $escortId = (int)($data['escort_id'] ?? 0);
        $status   = trim($data['status']     ?? '');
        if (!$escortId || !$status) jR(['success'=>false,'error'=>'Escort ID and status required.'], 422);
        if (!in_array($status, ['accepted','in_progress','completed','cancelled'], true))
            jR(['success'=>false,'error'=>'Invalid status.'], 422);

        $completedAt = ($status === 'completed') ? ', escort_completed_at=NOW()' : '';
        $stmt = $conn->prepare("
            UPDATE donor_escort_request
            SET status=?, assigned_delivery_staff_id=? $completedAt
            WHERE id=?
        ");
        $stmt->bind_param('sii', $status, $uid, $escortId);
        if (!$stmt->execute()) jR(['success'=>false,'error'=>'Update failed: '.$conn->error], 500);
        $stmt->close();
        jR(['success'=>true, 'message'=>'Escort status updated to '.$status]);
        break;
    }

    /* ══════════════════════════════════════════════
       CONFIRM DRONE HANDOFF
    ══════════════════════════════════════════════ */
    case 'confirm_drone_handoff': {
        $uid  = requireDelivery();
        $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $dispatchId = (int)($data['dispatch_id'] ?? 0);
        if (!$dispatchId) jR(['success'=>false,'error'=>'Dispatch ID required.'], 422);

        $stmt = $conn->prepare("
            UPDATE drone_dispatch
            SET status='delivered', actual_arrival=NOW()
            WHERE id=? AND status IN ('scheduled','dispatched','in_transit','en_route','awaiting_handoff')
        ");
        $stmt->bind_param('i', $dispatchId);
        if (!$stmt->execute()) jR(['success'=>false,'error'=>'Update failed: '.$conn->error], 500);
        $stmt->close();

        /* Also mark the blood request as delivered */
        $stmt = $conn->prepare("
            UPDATE blood_request SET status='delivered', delivered_at=NOW()
            WHERE id = (SELECT blood_request_id FROM drone_dispatch WHERE id=?)
        ");
        $stmt->bind_param('i', $dispatchId);
        $stmt->execute(); $stmt->close();

        jR(['success'=>true, 'message'=>'Drone handoff confirmed. Delivery completed.']);
        break;
    }

    default:
        jR(['success'=>false,'error'=>'Unknown action: '.htmlspecialchars($action)], 400);
}