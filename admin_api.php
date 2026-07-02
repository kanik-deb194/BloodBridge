<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

function jR($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAdmin()
{
    $uid  = $_SESSION['user_id'] ?? null;
    $role = $_SESSION['role']    ?? null;
    if ($uid !== null && is_numeric($uid) && $role === 'admin') {
        return (int) $uid;
    }
    jR(['success' => false, 'error' => 'Unauthorised. Please log in.'], 401);
}

function fmtD($d)
{
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('M j, Y', strtotime($d));
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'dashboard':
        handleDashboard();
        break;
    case 'investigate':
        handleInvestigate();
        break;
    case 'mark_investigated':
        handleMarkInvestigated();
        break;
    case 'ratings':
        handleRatings();
        break;
    case 'coldchain':
        handleColdChain();
        break;
    case 'thalassemia':
        handleThalassemia();
        break;
    case 'rotations':
        handleRotations();
        break;
    case 'ai_models':
        handleAiModels();
        break;
    case 'expiry':
        handleExpiry();
        break;
    case 'emergency':
        handleEmergency();
        break;
    case 'forecast':
        handleForecast();
        break;
    case 'profile':
        handleProfile();
        break;
    case 'update_profile':
        handleUpdateProfile();
        break;
    case 'users':
        handleUsers();
        break;
    case 'user_action':
        handleUserAction();
        break;
    case 'blood_banks':
        handleBloodBanks();
        break;
    case 'approve_blood_bank':
        handleApproveBloodBank();
        break;
    case 'system_settings':
        handleSystemSettings();
        break;
    case 'update_system_setting':
        handleUpdateSystemSetting();
        break;
    case 'notification_templates':
        handleNotificationTemplates();
        break;
    case 'update_notification_template':
        handleUpdateNotificationTemplate();
        break;
    case 'admin_notifications':
        handleAdminNotifications();
        break;
    case 'admin_mark_read':
        handleAdminMarkRead();
        break;
    case 'send_warning':
        handleSendWarning();
        break;
    case 'cool_down':
        handleCoolDown();
        break;
    case 'block_target':
        handleBlockTarget();
        break;
    case 'cancel_block':
        handleCancelBlock();
        break;
    case 'get_warning_responses':
        handleGetWarningResponses();
        break;
    case 'warning_response_detail':
        handleWarningResponseDetail();
        break;
    case 'send_improvement_plan':
        handleSendImprovementPlan();
        break;
    case 'toggle_bank_status':
        handleToggleBankStatus();
        break;
    case 'emergency_action':
        handleEmergencyAction();
        break;
    default:
        jR(['success' => false, 'error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
}

function handleDashboard()
{
    global $conn;
    $uid = requireAdmin();

    $stmt = $conn->prepare("SELECT id, full_name, email, role, last_login, created_at FROM admin WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $admin = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$admin) jR(['success' => false, 'error' => 'Admin not found.'], 404);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bank WHERE status='active'");
    $totalBanks = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r1 = $conn->query("SELECT COUNT(*) AS c FROM blood_bank WHERE rating_avg > 0 AND rating_avg < 3");
    $r2 = $conn->query("SELECT COUNT(*) AS c FROM donor_recipient WHERE trust_score < 50");
    $lowRatingBanks = (int)($r1 ? $r1->fetch_assoc()['c'] : 0);
    $lowTrustDonors = (int)($r2 ? $r2->fetch_assoc()['c'] : 0);
    $suspFlags = $lowRatingBanks + $lowTrustDonors;
    $lowRating = $lowRatingBanks;

    $r = $conn->query("SELECT COUNT(*) AS c FROM donor_recipient dr LEFT JOIN users u ON u.id = dr.user_id WHERE COALESCE(u.is_active, 1) = 1");
    $totalUsers = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM donor_recipient WHERE is_available=1");
    $activeDonors = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bank WHERE status='active'");
    $activeBanks = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_request WHERE status IN ('pending','approved')");
    $openRequests = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM transfusion");
    $transfusionCount = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("
        SELECT blood_group, COUNT(*) AS cnt
        FROM blood_bag
        WHERE status='available' AND expiry_date >= CURDATE()
        GROUP BY blood_group
    ");
    $bloodStock = [];
    if ($r) while ($row = $r->fetch_assoc()) $bloodStock[$row['blood_group']] = (int)$row['cnt'];

    $r = $conn->query("
        SELECT bb.id, bb.name, bb.city, bb.rating_avg, bb.status,
               COUNT(br.id) AS review_count,
               MAX(al.created_at) AS last_audit
        FROM blood_bank bb
        LEFT JOIN bank_review br ON br.blood_bank_id = bb.id
        LEFT JOIN audit_log al   ON al.table_name = 'blood_bank' AND al.record_id = bb.id
        GROUP BY bb.id
        ORDER BY bb.rating_avg ASC
        LIMIT 6
    ");
    $bankRatings = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

    $r = $conn->query("
        (SELECT 'suspicious' AS type,
                sal.description AS msg,
                sal.activity_type AS sub,
                sal.detected_at AS ts,
                sal.is_investigated AS resolved,
                sal.id,
                u.full_name AS entity_name
         FROM suspicious_activity_log sal
         LEFT JOIN users u ON u.id = sal.donor_user_id
         WHERE sal.is_investigated = 0
         ORDER BY sal.detected_at DESC LIMIT 5)
        UNION ALL
        (SELECT 'temperature' AS type,
                CONCAT('Temp breach: ', tl.temperature_celsius, '°C at sensor ', tl.sensor_id) AS msg,
                'Cold Chain' AS sub,
                tl.recorded_at AS ts,
                0 AS resolved,
                tl.id,
                bb.name AS entity_name
         FROM temperature_log tl
         LEFT JOIN blood_bank bb ON bb.id = tl.blood_bank_id
         WHERE tl.is_alert = 1
         ORDER BY tl.recorded_at DESC LIMIT 3)
        ORDER BY ts DESC LIMIT 8
    ");
    $alerts = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bank WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())");
    $newBanksThisMonth = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM notification WHERE is_read=0");
    $unreadNotif = (int)($r ? $r->fetch_assoc()['c'] : 0);

    jR([
        'success' => true,
        'admin'   => [
            'id'         => (int)$admin['id'],
            'full_name'  => $admin['full_name'],
            'email'      => $admin['email'],
            'role'       => $admin['role'],
            'last_login' => fmtD($admin['last_login']),
            'created_at' => fmtD($admin['created_at']),
        ],
        'metrics' => [
            'total_banks'      => $totalBanks,
            'suspicious_flags' => $suspFlags,
            'low_rating'       => $lowRating,
            'total_users'      => $totalUsers,
            'new_banks_month'  => $newBanksThisMonth,
        ],
        'network' => [
            'active_donors'  => $activeDonors,
            'active_banks'   => $activeBanks,
            'open_requests'  => $openRequests,
            'lives_saved'    => $transfusionCount * 3,
        ],
        'blood_stock'  => $bloodStock,
        'bank_ratings' => $bankRatings,
        'alerts'       => $alerts,
        'unread_notif' => $unreadNotif,
    ]);
}

function handleInvestigate()
{
    global $conn;
    requireAdmin();

    $entity = trim($_GET['entity'] ?? 'user');

    if ($entity === 'blood_bank') {
        $res = $conn->query("
            SELECT
                bb.id,
                bb.name,
                bb.city,
                bb.email,
                bb.registration_no,
                bb.role,
                bb.status,
                bb.blocked_at,
                bb.block_expires_at,
                COALESCE(bb.rating_avg, 0) AS rating,
                bb.status AS status_label,
                'blood_bank' AS target_type,
                CONCAT('BANK-', LPAD(bb.id, 4, '0')) AS display_id
            FROM blood_bank bb
            WHERE bb.role IN ('blood_bank', 'hospital', 'medical_college')
              AND COALESCE(bb.rating_avg, 0) < 3.00
            ORDER BY bb.rating_avg ASC
        ");
        $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

        $now = new DateTime();
        foreach ($rows as &$row) {
            $bid = (int)$row['id'];
            if ($row['status'] === 'blocked' && $row['block_expires_at']) {
                $exp = new DateTime($row['block_expires_at']);
                if ($now >= $exp) {
                    $conn->query("UPDATE blood_bank SET status='active', blocked_at=NULL, block_expires_at=NULL WHERE id=$bid");
                    $row['status'] = 'active';
                    $row['status_label'] = 'active';
                    $row['blocked_at'] = null;
                    $row['block_expires_at'] = null;
                }
            }
            $wRes = $conn->query("
                SELECT
                    CASE
                        WHEN action_taken='acknowledged'          THEN 'Acknowledged'
                        WHEN action_taken='improvement_submitted'  THEN 'Improvement Submitted'
                        WHEN action_taken='appealed'              THEN 'Appealed'
                        WHEN status='sent'                        THEN 'Warning Sent'
                        WHEN status='cool_down'                   THEN 'Cool Down Applied'
                        WHEN status='improvement'                 THEN 'Improvement Plan Sent'
                        WHEN status='blocked'                     THEN 'Blocked'
                        WHEN status='block_cancelled'            THEN 'Block Cancelled'
                        WHEN status='acknowledged'                THEN 'Acknowledged'
                        WHEN status='appealed'                    THEN 'Appealed'
                        WHEN status='improvement_submitted'       THEN 'Improvement Submitted'
                        ELSE 'Warning Sent'
                    END AS label,
                    status AS raw_status,
                    sent_at AS at
                FROM admin_warning
                WHERE target_type='blood_bank' AND target_id=$bid
                ORDER BY sent_at DESC LIMIT 5
            ");
            $row['timeline']    = $wRes ? $wRes->fetch_all(MYSQLI_ASSOC) : [];
            $row['warning_id']  = null;
            $latestRaw = count($row['timeline']) > 0 ? ($row['timeline'][0]['raw_status'] ?? '') : '';
            $row['status_code'] = $row['status'] === 'blocked' ? 'blocked'
                                : ($latestRaw === 'acknowledged'          ? 'acknowledged'
                                : ($latestRaw === 'improvement_submitted' ? 'improvement_submitted'
                                : ($latestRaw === 'appealed'              ? 'appealed'
                                : ($latestRaw === 'cool_down'             ? 'cool_down'
                                : ($latestRaw === 'improvement'           ? 'improvement'
                                : (count($row['timeline']) > 0            ? 'sent' : 'active'))))));
            $row['has_response'] = in_array($latestRaw, ['acknowledged','improvement_submitted','appealed','improvement']);
            foreach ($row['timeline'] as &$tl) { unset($tl['raw_status']); } unset($tl);
            $wIdRes = $conn->query("SELECT id FROM admin_warning WHERE target_type='blood_bank' AND target_id=$bid ORDER BY sent_at DESC LIMIT 1");
            if ($wIdRes) {
                $wIdRow = $wIdRes->fetch_assoc();
                $row['warning_id'] = $wIdRow ? $wIdRow['id'] : null;
            }
        }
        unset($row);

        jR(['success' => true, 'entity' => 'blood_bank', 'rows' => $rows]);

    } else {
        $res = $conn->query("
            SELECT
                COALESCE(u.id, dr.user_id) AS id,
                COALESCE(u.full_name, CONCAT('Deleted User #', dr.user_id)) AS name,
                COALESCE(u.email, '') AS email,
                COALESCE(u.role, 'donor_recipient') AS role,
                COALESCE(u.is_active, 0) AS status,
                u.blocked_at,
                u.block_expires_at,
                dr.trust_score,
                dr.blood_group,
                'user' AS target_type,
                CONCAT('USR-', LPAD(COALESCE(u.id, dr.user_id), 4, '0')) AS display_id,
                CASE WHEN COALESCE(u.is_active, 0) = 0 THEN 'blocked'
                     ELSE 'active'
                END AS status_label
            FROM donor_recipient dr
            LEFT JOIN users u ON u.id = dr.user_id
            WHERE dr.trust_score < 50
            ORDER BY dr.trust_score ASC
        ");
        $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

        $now = new DateTime();
        foreach ($rows as &$row) {
            $uid = (int)$row['id'];
            if (isset($row['status']) && (int)$row['status'] === 0 && $row['block_expires_at']) {
                $exp = new DateTime($row['block_expires_at']);
                if ($now >= $exp) {
                    $conn->query("UPDATE users SET is_active=1, blocked_at=NULL, block_expires_at=NULL WHERE id=$uid");
                    $row['status'] = 1;
                    $row['status_label'] = 'active';
                    $row['blocked_at'] = null;
                    $row['block_expires_at'] = null;
                }
            }
            $wRes = $conn->query("
                SELECT
                    CASE
                        WHEN action_taken='acknowledged'          THEN 'Acknowledged'
                        WHEN action_taken='improvement_submitted'  THEN 'Improvement Submitted'
                        WHEN action_taken='appealed'              THEN 'Appealed'
                        WHEN status='sent'                        THEN 'Warning Sent'
                        WHEN status='cool_down'                   THEN 'Cool Down Applied'
                        WHEN status='improvement'                 THEN 'Improvement Plan Sent'
                        WHEN status='blocked'                     THEN 'Blocked'
                        WHEN status='block_cancelled'            THEN 'Block Cancelled'
                        WHEN status='acknowledged'                THEN 'Acknowledged'
                        WHEN status='appealed'                    THEN 'Appealed'
                        WHEN status='improvement_submitted'       THEN 'Improvement Submitted'
                        ELSE 'Warning Sent'
                    END AS label,
                    status AS raw_status,
                    sent_at AS at
                FROM admin_warning
                WHERE target_type='user' AND target_id=$uid
                ORDER BY sent_at DESC LIMIT 5
            ");
            $row['timeline']    = $wRes ? $wRes->fetch_all(MYSQLI_ASSOC) : [];
            $row['warning_id']  = null;
            $latestRaw = count($row['timeline']) > 0 ? ($row['timeline'][0]['raw_status'] ?? '') : '';
            $row['status_code'] = $row['status'] == 0 ? 'blocked'
                                : ($latestRaw === 'acknowledged'          ? 'acknowledged'
                                : ($latestRaw === 'improvement_submitted' ? 'improvement_submitted'
                                : ($latestRaw === 'appealed'              ? 'appealed'
                                : ($latestRaw === 'cool_down'             ? 'cool_down'
                                : ($latestRaw === 'improvement'           ? 'improvement'
                                : (count($row['timeline']) > 0            ? 'sent' : 'active'))))));
            $row['has_response'] = in_array($latestRaw, ['acknowledged','improvement_submitted','appealed','improvement']);
            foreach ($row['timeline'] as &$tl) { unset($tl['raw_status']); } unset($tl);
            $wIdRes = $conn->query("SELECT id FROM admin_warning WHERE target_type='user' AND target_id=$uid ORDER BY sent_at DESC LIMIT 1");
            if ($wIdRes) {
                $wIdRow = $wIdRes->fetch_assoc();
                $row['warning_id'] = $wIdRow ? $wIdRow['id'] : null;
            }
        }
        unset($row);

        jR(['success' => true, 'entity' => 'user', 'rows' => $rows]);
    }
}

function handleMarkInvestigated()
{
    global $conn;
    requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id   = (int)($data['id'] ?? 0);
    if (!$id) jR(['success' => false, 'error' => 'ID required.'], 422);

    $stmt = $conn->prepare("UPDATE suspicious_activity_log SET is_investigated=1 WHERE id=?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    jR(['success' => true, 'message' => 'Marked as investigated.']);
}

function handleRatings()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("
        SELECT bb.id, bb.name, bb.city, bb.rating_avg, bb.status,
               COUNT(br.id) AS review_count,
               MIN(br.rating) AS min_rating,
               MAX(br.rating) AS max_rating
        FROM blood_bank bb
        LEFT JOIN bank_review br ON br.blood_bank_id = bb.id
        GROUP BY bb.id
        ORDER BY bb.rating_avg ASC
    ");
    $banks = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'banks' => $banks]);
}

function handleColdChain()
{
    global $conn;
    requireAdmin();

    $r = $conn->query("SELECT COUNT(*) AS c FROM temperature_log WHERE is_alert=1");
    $total = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM temperature_log WHERE is_alert=1 AND resolved_at IS NULL");
    $unresolved = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(DISTINCT blood_bank_id) AS c FROM temperature_log WHERE is_alert=1");
    $banksAffected = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $res = $conn->query("
        SELECT tl.id, tl.sensor_id, tl.temperature_celsius, tl.recorded_at, tl.is_alert,
               bb.name AS bank_name
        FROM temperature_log tl
        LEFT JOIN blood_bank bb ON bb.id = tl.blood_bank_id
        ORDER BY tl.recorded_at DESC
        LIMIT 100
    ");
    $logs = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'total' => $total, 'unresolved' => $unresolved, 'banks_affected' => $banksAffected, 'logs' => $logs]);
}

function handleThalassemia()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("
        SELECT tc.id, tc.is_carrier, tc.confirmed_at,
               u.full_name  AS patient_name,
               uc.full_name AS confirmed_by_name
        FROM thalassemia_carrier tc
        LEFT JOIN users u  ON u.id  = tc.user_id
        LEFT JOIN users uc ON uc.id = tc.confirmed_by
        ORDER BY tc.confirmed_at DESC
    ");
    $carriers = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'carriers' => $carriers]);
}

function handleRotations()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("
        SELECT ir.id, ir.destination_country, ir.destination_bank_name,
               ir.blood_group, ir.units, ir.rotation_date, ir.status,
               u.full_name  AS donor_name,
               bb.name      AS source_bank_name
        FROM international_rotation ir
        LEFT JOIN users u      ON u.id  = ir.donor_user_id
        LEFT JOIN blood_bank bb ON bb.id = ir.source_blood_bank_id
        ORDER BY ir.rotation_date DESC
    ");
    $rotations = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'rotations' => $rotations]);
}

function handleAiModels()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("
        SELECT am.id, am.model_name, am.model_type, am.framework,
               am.version, am.training_accuracy, am.is_active, am.trained_at,
               bb.name AS bank_name
        FROM ai_model am
        LEFT JOIN blood_bank bb ON bb.id = am.blood_bank_id
        ORDER BY am.trained_at DESC
    ");
    $models = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'models' => $models]);
}

function handleExpiry()
{
    global $conn;
    requireAdmin();

    $r = $conn->query("SELECT COUNT(*) AS c FROM expiry_alert");
    $total = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM expiry_alert WHERE days_until_expiry <= 3 AND resolved_at IS NULL");
    $critical = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM expiry_alert WHERE resolved_at IS NOT NULL");
    $resolved = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $res = $conn->query("
        SELECT ea.id, ea.days_until_expiry, ea.alert_sent_at, ea.resolved_at, ea.action_taken,
               bb.name   AS bank_name,
               ea.blood_bag_id
        FROM expiry_alert ea
        LEFT JOIN blood_bank bb ON bb.id = ea.blood_bank_id
        ORDER BY ea.days_until_expiry ASC, ea.alert_sent_at DESC
    ");
    $alerts = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'total' => $total, 'critical' => $critical, 'resolved' => $resolved, 'alerts' => $alerts]);
}

function handleEmergency()
{
    global $conn;
    requireAdmin();

    /* ── Metrics ── */
    $r = $conn->query("SELECT COUNT(*) AS c FROM emergency_request");
    $eTotal = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM emergency_request WHERE status='pending'");
    $ePending = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM emergency_request WHERE status='processed'");
    $eProcessed = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_request");
    $bTotal = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_request WHERE status='pending'");
    $bPending = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_request WHERE status IN ('approved','completed','delivered')");
    $bProcessed = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* ── Unified request list ── */
    $res = $conn->query("
        SELECT
            'emergency' AS request_type,
            er.id,
            er.extracted_blood_group AS blood_group,
            NULL AS units_required,
            er.extracted_location AS location,
            er.requester_phone AS phone,
            COALESCE(u.full_name, '—') AS requester_name,
            er.status,
            'Emergency' AS urgency,
            er.created_at,
            er.requester_user_id AS user_id
        FROM emergency_request er
        LEFT JOIN users u ON u.id = er.requester_user_id

        UNION ALL

        SELECT
            'blood_request' AS request_type,
            br.id,
            br.blood_group,
            br.units_required,
            COALESCE(bb.city, '—') AS location,
            COALESCE(bb.phone, '—') AS phone,
            COALESCE(u.full_name, bb.name, '—') AS requester_name,
            br.status,
            br.urgency,
            br.requested_at AS created_at,
            br.requester_user_id AS user_id
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        ORDER BY created_at DESC
        LIMIT 100
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR([
        'success'  => true,
        'total'    => $eTotal + $bTotal,
        'pending'  => $ePending + $bPending,
        'processed'=> $eProcessed + $bProcessed,
        'e_total'  => $eTotal,
        'b_total'  => $bTotal,
        'requests' => $requests,
    ]);
}

function handleEmergencyAction()
{
    global $conn;
    requireAdmin();

    $data   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $type   = $data['type'] ?? '';
    $id     = (int)($data['id'] ?? 0);
    $action = $data['action'] ?? '';

    if (!$id) {
        jR(['success' => false, 'error' => 'Request ID is required.'], 422);
    }

    if ($type === 'emergency') {
        if (!in_array($action, ['process', 'reset'], true)) {
            jR(['success' => false, 'error' => 'Invalid action for emergency request.'], 422);
        }
        $newStatus = $action === 'process' ? 'processed' : 'pending';
        $stmt = $conn->prepare("UPDATE emergency_request SET status = ? WHERE id = ?");
        $stmt->bind_param('si', $newStatus, $id);
        if (!$stmt->execute()) {
            jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
        }
        $stmt->close();
        jR(['success' => true, 'message' => 'Emergency request ' . ($action === 'process' ? 'processed' : 'reset') . '.']);

    } elseif ($type === 'blood_request') {
        if (!in_array($action, ['approve', 'reject', 'pending'], true)) {
            jR(['success' => false, 'error' => 'Invalid action for blood request.'], 422);
        }
        $map = ['approve' => 'approved', 'reject' => 'rejected', 'pending' => 'pending'];
        $newStatus = $map[$action];
        $stmt = $conn->prepare("UPDATE blood_request SET status = ? WHERE id = ?");
        $stmt->bind_param('si', $newStatus, $id);
        if (!$stmt->execute()) {
            jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
        }
        $stmt->close();
        jR(['success' => true, 'message' => 'Blood request ' . $newStatus . '.']);

    } else {
        jR(['success' => false, 'error' => 'Invalid request type.'], 422);
    }
}

function handleForecast()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("
        SELECT df.id, df.forecast_date, df.blood_group,
               df.predicted_units, df.lower_bound, df.upper_bound, df.generated_at,
               bb.name AS bank_name
        FROM demand_forecast df
        LEFT JOIN blood_bank bb ON bb.id = df.blood_bank_id
        ORDER BY df.forecast_date DESC, df.generated_at DESC
        LIMIT 100
    ");
    $forecasts = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'forecasts' => $forecasts]);
}

function handleProfile()
{
    global $conn;
    $uid = requireAdmin();

    $stmt = $conn->prepare("SELECT id, full_name, email, role, last_login, created_at FROM admin WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$profile) jR(['success' => false, 'error' => 'Profile not found.'], 404);
    jR(['success' => true, 'profile' => $profile]);
}

function handleUpdateProfile()
{
    global $conn;
    $uid  = requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $fullName = trim($data['full_name'] ?? '');
    $email    = trim($data['email']     ?? '');

    $errors = [];
    if (strlen($fullName) < 2) $errors[] = 'Name must be at least 2 characters.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email required.';
    if (!empty($errors)) jR(['success' => false, 'errors' => $errors], 422);

    $stmt = $conn->prepare("UPDATE admin SET full_name=?, email=? WHERE id=?");
    $stmt->bind_param('ssi', $fullName, $email, $uid);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
    $stmt->close();

    jR(['success' => true, 'message' => 'Profile updated successfully.']);
}

function handleUsers()
{
    global $conn;
    requireAdmin();

    $type   = $_GET['type'] ?? 'all';
    $status = $_GET['status'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $sql = "
        SELECT u.id, u.full_name, u.email, u.phone,
               COALESCE(d.blood_group, '') AS blood_group,
               u.is_active, u.created_at,
               d.last_donation_date AS last_donation,
               CASE
                   WHEN d.user_id IS NOT NULL THEN 'donor_recipient'
                   WHEN doc.user_id IS NOT NULL THEN 'doctor'
                   WHEN lt.user_id IS NOT NULL THEN 'lab_technician'
                   WHEN ds.user_id IS NOT NULL THEN 'delivery_staff'
                   ELSE u.role
               END AS user_type
        FROM users u
        LEFT JOIN donor_recipient d ON d.user_id = u.id
        LEFT JOIN doctor doc ON doc.user_id = u.id
        LEFT JOIN lab_technician lt ON lt.user_id = u.id
        LEFT JOIN delivery_staff ds ON ds.user_id = u.id
        WHERE 1=1
    ";

    if ($type !== 'all') {
        $typeMap = [
            'donor' => 'd.user_id IS NOT NULL',
            'donor_recipient' => 'd.user_id IS NOT NULL',
            'blood_bank' => "u.role = 'blood_bank'",
            'hospital' => "u.role = 'hospital'",
            'medical_college' => "u.role = 'medical_college'",
            'doctor' => 'doc.user_id IS NOT NULL',
            'lab_technician' => 'lt.user_id IS NOT NULL',
            'delivery_staff' => 'ds.user_id IS NOT NULL',
        ];
        if (isset($typeMap[$type])) {
            $sql .= " AND " . $typeMap[$type];
        }
    }
    if ($status !== 'all') {
        $active = ($status === 'active') ? 1 : 0;
        $sql .= " AND u.is_active = $active";
    }
    if ($search !== '') {
        $s = $conn->real_escape_string($search);
        $sql .= " AND (u.full_name LIKE '%$s%' OR u.email LIKE '%$s%' OR u.phone LIKE '%$s%')";
    }

    $sql .= " ORDER BY u.created_at DESC LIMIT 200";

    $res = $conn->query($sql);
    $users = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'users' => $users]);
}

function handleUserAction()
{
    global $conn;
    requireAdmin();

    $data   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $userId = (int)($data['user_id'] ?? 0);
    $action = $data['action'] ?? '';

    if (!$userId || !in_array($action, ['activate', 'deactivate'])) {
        jR(['success' => false, 'error' => 'Invalid user_id or action.'], 422);
    }

    $isActive = ($action === 'activate') ? 1 : 0;
    $stmt = $conn->prepare("UPDATE users SET is_active = ? WHERE id = ?");
    $stmt->bind_param('ii', $isActive, $userId);
    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
    }
    $stmt->close();

    jR(['success' => true, 'message' => 'User ' . ($action === 'activate' ? 'activated' : 'deactivated') . ' successfully.']);
}

function handleBloodBanks()
{
    global $conn;
    requireAdmin();

    $status     = $_GET['status'] ?? 'all';
    $approval   = $_GET['approval'] ?? 'all';
    $search     = trim($_GET['search'] ?? '');

    $sql = "
        SELECT bb.id, bb.name, bb.email, bb.phone, bb.city, bb.state,
               bb.status, bb.rating_avg, bb.created_at,
               COALESCE(u.full_name, '—') AS admin_name
        FROM blood_bank bb
        LEFT JOIN users u ON u.blood_bank_id = bb.id AND u.role = 'blood_bank'
        WHERE 1=1
    ";

    if ($status !== 'all') {
        $s = $conn->real_escape_string($status);
        $sql .= " AND bb.status = '$s'";
    }
    if ($approval !== 'all') {
        $s = $conn->real_escape_string($approval);
        $sql .= " AND bb.status = '$s'";
    }
    if ($search !== '') {
        $s = $conn->real_escape_string($search);
        $sql .= " AND (bb.name LIKE '%$s%' OR bb.email LIKE '%$s%' OR bb.city LIKE '%$s%')";
    }

    $sql .= " ORDER BY bb.created_at DESC";

    $res = $conn->query($sql);
    $banks = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'banks' => $banks]);
}

function handleApproveBloodBank()
{
    global $conn;
    requireAdmin();

    $data   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $bankId = (int)($data['bank_id'] ?? 0);
    $action = $data['action'] ?? '';

    if (!$bankId || !in_array($action, ['approve', 'reject'])) {
        jR(['success' => false, 'error' => 'Invalid bank_id or action.'], 422);
    }

    $status = ($action === 'approve') ? 'active' : 'rejected';

    $stmt = $conn->prepare("UPDATE blood_bank SET status = ? WHERE id = ?");
    $stmt->bind_param('si', $status, $bankId);
    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
    }
    $stmt->close();

    jR(['success' => true, 'message' => 'Blood bank ' . ($action === 'approve' ? 'approved' : 'rejected') . ' successfully.']);
}

function handleSystemSettings()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("SELECT id, setting_key, setting_value, data_type, description, updated_at FROM system_settings ORDER BY setting_key");
    $settings = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'settings' => $settings]);
}

function handleUpdateSystemSetting()
{
    global $conn;
    requireAdmin();

    $data  = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id    = (int)($data['id'] ?? 0);
    $value = trim($data['setting_value'] ?? '');

    if (!$id || $value === '') {
        jR(['success' => false, 'error' => 'ID and setting_value required.'], 422);
    }

    $stmt = $conn->prepare("UPDATE system_settings SET setting_value = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param('si', $value, $id);
    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
    }
    $stmt->close();

    jR(['success' => true, 'message' => 'Setting updated successfully.']);
}

function handleNotificationTemplates()
{
    global $conn;
    requireAdmin();

    $res = $conn->query("SELECT id, template_name, title, message, channel, created_at FROM notification_template ORDER BY template_name");
    $templates = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'templates' => $templates]);
}

function handleUpdateNotificationTemplate()
{
    global $conn;
    requireAdmin();

    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id      = (int)($data['id'] ?? 0);
    $title   = trim($data['title'] ?? '');
    $message = trim($data['message'] ?? '');
    $channel = trim($data['channel'] ?? '');

    if (!$id) {
        jR(['success' => false, 'error' => 'Template ID required.'], 422);
    }

    $fields = [];
    $params = [];
    $types  = '';

    if ($title !== '') {
        $fields[] = 'title = ?';
        $params[] = $title;
        $types   .= 's';
    }
    if ($message !== '') {
        $fields[] = 'message = ?';
        $params[] = $message;
        $types   .= 's';
    }
    if ($channel !== '' && in_array($channel, ['sms','email','push','in_app'])) {
        $fields[] = 'channel = ?';
        $params[] = $channel;
        $types   .= 's';
    }

    if (empty($fields)) {
        jR(['success' => false, 'error' => 'Nothing to update.'], 422);
    }

    $sql = "UPDATE notification_template SET " . implode(', ', $fields) . " WHERE id = ?";
    $params[] = $id;
    $types   .= 'i';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Update failed: ' . $conn->error], 500);
    }
    $stmt->close();

    jR(['success' => true, 'message' => 'Template updated successfully.']);
}

function handleAdminNotifications() {
    global $conn;
    requireAdmin();
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;
    $total  = (int)($conn->query("SELECT COUNT(*) AS c FROM notification")->fetch_assoc()['c'] ?? 0);
    $unread = (int)($conn->query("SELECT COUNT(*) AS c FROM notification WHERE is_read=0")->fetch_assoc()['c'] ?? 0);
    $res = $conn->query("SELECT id, user_id, title, message, is_read, created_at FROM notification ORDER BY created_at DESC LIMIT $limit OFFSET $offset");
    $notifications = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    foreach ($notifications as &$n) {
        $n['time_ago'] = $n['created_at'] ? timeAgoStr($n['created_at']) : '';
    }
    jR(['success' => true, 'notifications' => $notifications, 'total' => $total, 'unread' => $unread]);
}
function handleAdminMarkRead() {
    global $conn;
    requireAdmin();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id   = (int)($data['id'] ?? 0);
    if ($id) {
        $conn->query("UPDATE notification SET is_read=1 WHERE id=$id");
    } else {
        $conn->query("UPDATE notification SET is_read=1");
    }
    jR(['success' => true]);
}
function timeAgoStr($ds) {
    if (!$ds) return '';
    $now = time();
    $ts  = strtotime($ds);
    $diff = $now - $ts;
    if ($diff < 60) return $diff . 's ago';
    if ($diff < 3600) return intdiv($diff, 60) . ' min ago';
    if ($diff < 86400) return intdiv($diff, 3600) . ' hr ago';
    return intdiv($diff, 86400) . ' days ago';
}
function handleSendWarning() {
    global $conn;
    $adminId = requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $targetType = trim($data['target_type'] ?? '');
    $targetId   = (int)($data['target_id']   ?? 0);
    $message    = trim($data['message']       ?? '');

    if (!$targetId) jR(['success' => false, 'error' => 'target_id is required.'], 422);
    if (!$message)  jR(['success' => false, 'error' => 'Warning message is required.'], 422);
    if (!in_array($targetType, ['blood_bank','user'], true)) {
        jR(['success' => false, 'error' => 'Invalid target_type.'], 422);
    }

    $stmt = $conn->prepare("
        INSERT INTO admin_warning (admin_id, target_type, target_id, message, status, sent_at)
        VALUES (?, ?, ?, ?, 'sent', NOW())
    ");
    if (!$stmt) jR(['success' => false, 'error' => $conn->error], 500);
    $stmt->bind_param('isis', $adminId, $targetType, $targetId, $message);
    if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
    $stmt->close();

    if ($targetType === 'user') {
        $title = 'Admin Warning';
        $n = $conn->prepare("INSERT INTO notification (user_id, title, message, is_read, created_at) VALUES (?,?,?,0,NOW())");
        if ($n) { $n->bind_param('iss', $targetId, $title, $message); $n->execute(); $n->close(); }
    }

    jR(['success' => true, 'message' => 'Warning sent successfully.']);
}

function handleCoolDown() {
    global $conn;
    $adminId = requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $targetType = trim($data['target_type'] ?? '');
    $targetId   = (int)($data['target_id']   ?? 0);
    $reason     = trim($data['reason']        ?? '');

    if (!$targetId)  jR(['success' => false, 'error' => 'target_id is required.'], 422);
    if (!$reason)    jR(['success' => false, 'error' => 'Please provide a reason for the cool down.'], 422);
    if (!in_array($targetType, ['blood_bank', 'user'], true))
        jR(['success' => false, 'error' => 'Invalid target_type.'], 422);

    $conn->begin_transaction();
    try {
        $del = $conn->prepare("DELETE FROM admin_warning WHERE target_type=? AND target_id=?");
        if (!$del) throw new Exception($conn->error);
        $del->bind_param('si', $targetType, $targetId);
        if (!$del->execute()) throw new Exception($del->error);
        $del->close();

        if ($targetType === 'blood_bank') {
            $upd = $conn->prepare("UPDATE blood_bank SET status='active' WHERE id=?");
            if (!$upd) throw new Exception($conn->error);
            $upd->bind_param('i', $targetId);
            if (!$upd->execute()) throw new Exception($upd->error);
            $upd->close();
        }

        $logMsg = "Cool Down applied by admin. Reason: $reason";
        $ins = $conn->prepare("INSERT INTO admin_warning (admin_id, target_type, target_id, message, status, sent_at) VALUES (?, ?, ?, ?, 'cool_down', NOW())");
        if (!$ins) throw new Exception($conn->error);
        $ins->bind_param('isis', $adminId, $targetType, $targetId, $logMsg);
        if (!$ins->execute()) throw new Exception($ins->error);
        $ins->close();

        $conn->commit();

        $successMsg = $targetType === 'blood_bank'
            ? 'Cool Down applied. All warnings cleared and bank status reset to active.'
            : 'Cool Down applied. All warnings cleared. Trust score unchanged.';

        jR(['success' => true, 'message' => $successMsg]);

    } catch (Exception $e) {
        $conn->rollback();
        jR(['success' => false, 'error' => 'Cool Down failed: ' . $e->getMessage()], 500);
    }
}

function handleBlockTarget() {
    global $conn;
    $adminId = requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $targetType = trim($data['target_type'] ?? '');
    $targetId   = (int)($data['target_id']   ?? 0);
    $reason     = trim($data['reason']        ?? 'Blocked by admin.');

    if (!$targetId) jR(['success' => false, 'error' => 'target_id is required.'], 422);

    if ($targetType === 'blood_bank') {
        $stmt = $conn->prepare("UPDATE blood_bank SET status='blocked', blocked_at=NOW(), block_expires_at=DATE_ADD(NOW(), INTERVAL 15 DAY) WHERE id=?");
        $stmt->bind_param('i', $targetId);
        if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
        $stmt->close();
    } elseif ($targetType === 'user') {
        $stmt = $conn->prepare("UPDATE users SET is_active=0, blocked_at=NOW(), block_expires_at=DATE_ADD(NOW(), INTERVAL 15 DAY) WHERE id=?");
        $stmt->bind_param('i', $targetId);
        if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
        $stmt->close();
    } else {
        jR(['success' => false, 'error' => 'Invalid target_type.'], 422);
    }

    $blockMsg = "Account blocked. Reason: $reason";
    $ins = $conn->prepare("INSERT INTO admin_warning (admin_id, target_type, target_id, message, status, sent_at) VALUES (?,?,?,?,'blocked',NOW())");
    if ($ins) { $ins->bind_param('isis', $adminId, $targetType, $targetId, $blockMsg); $ins->execute(); $ins->close(); }

    jR(['success' => true, 'message' => 'Blocked for 15 days successfully.']);
}

function handleCancelBlock() {
    global $conn;
    $adminId = requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $targetType = trim($data['target_type'] ?? '');
    $targetId   = (int)($data['target_id']   ?? 0);

    if (!$targetId) jR(['success' => false, 'error' => 'target_id is required.'], 422);

    if ($targetType === 'blood_bank') {
        $stmt = $conn->prepare("UPDATE blood_bank SET status='active', blocked_at=NULL, block_expires_at=NULL WHERE id=? AND status='blocked'");
        $stmt->bind_param('i', $targetId);
        if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
        $stmt->close();
    } elseif ($targetType === 'user') {
        $stmt = $conn->prepare("UPDATE users SET is_active=1, blocked_at=NULL, block_expires_at=NULL WHERE id=? AND is_active=0");
        $stmt->bind_param('i', $targetId);
        if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
        $stmt->close();
    } else {
        jR(['success' => false, 'error' => 'Invalid target_type.'], 422);
    }

    $upd = $conn->prepare("UPDATE admin_warning SET status='block_cancelled' WHERE target_type=? AND target_id=? AND status='blocked' ORDER BY sent_at DESC LIMIT 1");
    if ($upd) { $upd->bind_param('si', $targetType, $targetId); $upd->execute(); $upd->close(); }

    jR(['success' => true, 'message' => 'Block cancelled successfully.']);
}

function handleGetWarningResponses() {
    global $conn;
    requireAdmin();

    $targetType = trim($_GET['target_type'] ?? 'blood_bank');
    $targetId   = (int)($_GET['target_id']  ?? 0);
    if (!$targetId) jR(['success' => false, 'error' => 'target_id required.'], 422);

    $hasExtra = false;
    $chk = $conn->query("SHOW COLUMNS FROM `admin_warning` LIKE 'action_taken'");
    if ($chk && $chk->num_rows > 0) $hasExtra = true;

    $extraSel = $hasExtra ? ", aw.action_taken, aw.improvement_plan, aw.appeal_reason, aw.is_dismissed" : "";

    $stmt = $conn->prepare("
        SELECT aw.id, aw.message, aw.status, aw.sent_at, aw.response, aw.responded_at
               $extraSel,
               a.full_name AS admin_name
        FROM admin_warning aw
        LEFT JOIN admin a ON a.id = aw.admin_id
        WHERE aw.target_type = ? AND aw.target_id = ?
        ORDER BY aw.sent_at DESC
    ");
    if (!$stmt) jR(['success' => false, 'error' => $conn->error], 500);
    $stmt->bind_param('si', $targetType, $targetId);
    $stmt->execute();
    $warnings = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($warnings as &$w) {
        $w['bank_action']  = $w['action_taken'] ?? null;
        $w['bank_message'] = null;
        if (!empty($w['action_taken'])) {
            $w['bank_message'] = match($w['action_taken']) {
                'acknowledged'          => 'Acknowledged by recipient.',
                'improvement_submitted' => $w['improvement_plan'] ?? 'Improvement plan submitted.',
                'appealed'              => $w['appeal_reason']    ?? 'Appeal submitted.',
                default                 => null,
            };
        }
    }
    unset($w);

    $name = '—';
    if ($targetType === 'blood_bank') {
        $r = $conn->query("SELECT name FROM blood_bank WHERE id=$targetId LIMIT 1");
        if ($r) $name = $r->fetch_assoc()['name'] ?? '—';
    } else {
        $r = $conn->query("SELECT full_name FROM users WHERE id=$targetId LIMIT 1");
        if ($r) $name = $r->fetch_assoc()['full_name'] ?? '—';
    }

    jR(['success' => true, 'warnings' => $warnings, 'bank_name' => $name]);
}

function handleWarningResponseDetail() {
    global $conn;
    requireAdmin();
    $wid = (int)($_GET['warning_id'] ?? 0);
    if (!$wid) jR(['success' => false, 'error' => 'warning_id required.'], 422);

    $stmt = $conn->prepare("SELECT aw.*, a.full_name AS admin_name FROM admin_warning aw LEFT JOIN admin a ON a.id=aw.admin_id WHERE aw.id=? LIMIT 1");
    $stmt->bind_param('i', $wid);
    $stmt->execute();
    $warning = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$warning) jR(['success' => false, 'error' => 'Warning not found.'], 404);
    jR(['success' => true, 'warning' => $warning]);
}

/* ══════════════════════════════════════════════════════════
   SEND IMPROVEMENT PLAN (Admin → User or Blood Bank)
   Adds admin_improvement_plan column if missing, then saves
   the plan text to the most recent warning for that target.
══════════════════════════════════════════════════════════ */
function handleSendImprovementPlan()
{
    global $conn;
    $adminId = requireAdmin();
    $data    = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $targetType = trim($data['target_type'] ?? '');
    $targetId   = (int)($data['target_id']  ?? 0);
    $plan       = trim($data['plan']         ?? '');

    if (!$targetId || !in_array($targetType, ['user', 'blood_bank'], true)) {
        jR(['success' => false, 'error' => 'target_type and target_id are required.'], 422);
    }
    if ($plan === '') {
        jR(['success' => false, 'error' => 'Improvement plan text is required.'], 422);
    }

    /* Ensure admin_improvement_plan column exists */
    $chk = $conn->query("SHOW COLUMNS FROM `admin_warning` LIKE 'admin_improvement_plan'");
    if ($chk && $chk->num_rows === 0) {
        $conn->query("ALTER TABLE `admin_warning` ADD COLUMN `admin_improvement_plan` TEXT NULL AFTER `improvement_plan`");
    }

    /* Ensure admin_improvement_sent_at column exists */
    $chk2 = $conn->query("SHOW COLUMNS FROM `admin_warning` LIKE 'admin_improvement_sent_at'");
    if ($chk2 && $chk2->num_rows === 0) {
        $conn->query("ALTER TABLE `admin_warning` ADD COLUMN `admin_improvement_sent_at` DATETIME NULL AFTER `admin_improvement_plan`");
    }

    /* Verify a warning exists for this target first */
    $stmt = $conn->prepare("
        SELECT id FROM admin_warning
        WHERE target_type = ? AND target_id = ? AND status NOT IN ('blocked','cool_down')
        ORDER BY sent_at DESC LIMIT 1
    ");
    if (!$stmt) jR(['success' => false, 'error' => $conn->error], 500);
    $stmt->bind_param('si', $targetType, $targetId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        jR(['success' => false, 'error' => 'No active warning found for this target. Send a warning first.'], 404);
    }

    /* INSERT a new timeline row with status='improvement' and current timestamp
       This ensures it always appears at the top of the timeline with the correct date.
       Store the plan text on this row so the bank/user dashboard can read it. */
    $planMsg = 'Admin sent an improvement plan.';
    $ins = $conn->prepare("
        INSERT INTO admin_warning
            (admin_id, target_type, target_id, message, status, sent_at, admin_improvement_plan, is_dismissed)
        VALUES (?, ?, ?, ?, 'improvement', NOW(), ?, 0)
    ");
    if (!$ins) jR(['success' => false, 'error' => $conn->error], 500);
    $ins->bind_param('isiss', $adminId, $targetType, $targetId, $planMsg, $plan);
    if (!$ins->execute()) jR(['success' => false, 'error' => $ins->error], 500);
    $ins->close();

    jR(['success' => true, 'message' => 'Improvement plan sent successfully.']);
}

function handleToggleBankStatus()
{
    global $conn;
    $adminId = requireAdmin();

    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $bankId = (int)($data['bank_id'] ?? 0);
    $newStatus = trim($data['status'] ?? '');

    if (!$bankId) jR(['success' => false, 'error' => 'bank_id is required.'], 422);
    if (!in_array($newStatus, ['active', 'inactive'])) jR(['success' => false, 'error' => 'Invalid status. Use active or inactive.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bank SET status = ? WHERE id = ?");
    $stmt->bind_param('si', $newStatus, $bankId);

    if (!$stmt->execute()) jR(['success' => false, 'error' => $stmt->error], 500);
    $stmt->close();

    $label = $newStatus === 'active' ? 'activated' : 'deactivated';
    jR(['success' => true, 'message' => "Blood bank {$label} successfully."]);
}