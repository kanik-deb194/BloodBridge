<?php
/* ============================================================
   BloodBridge — mc_api.php  (FIXED)
   Medical College Dashboard API
   Session: $_SESSION['blood_bank_id'] = blood_bank.id  (role='medical_college')
            OR $_SESSION['user_id']    = blood_bank.id
   ============================================================

   FIXES APPLIED
   ─────────────
   1. handleDashboard(): JOIN blood_request → patient_registry was wrong.
      blood_request.requester_user_id → users.id, NOT patient_registry.id.
      Fixed the JOIN so patient names are fetched via the users table.

   2. handleDashboard(): College name now also updates the topnav badge
      via the API response (JS picks it up).

   3. handleRequests(): Same broken JOIN fixed (users table for patient name).

   4. handleSubmitRequest(): Removed duplicate broken bind_param block.
      Also fixed null handling for $patientId via explicit NULL SQL branch.

   5. handlePatients(): Fixed dbOne() count query — it was using ? placeholders
      without binding params, returning wrong totals. Replaced with a proper
      prepared statement for the count query.

   6. handleDashboard() total_patients: Now counts only patients that have
      at least one blood_request linked to this college, giving a meaningful
      "patients served" count rather than the global registry total.
      (If you want global count, just revert that one line.)

   7. session_debug action kept for troubleshooting auth.
   ============================================================ */

if (ob_get_level() === 0) ob_start();
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// Use same session settings as login.php — no custom cookie params
// This ensures the same session cookie is read after login
require_once __DIR__ . '/config.php';

while (ob_get_level() > 0) ob_end_clean();
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

/* ── Helpers ── */
function jR($data, $code = 200) {
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function reqBody() {
    $raw  = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : $_POST;
}

/**
 * dbOne — run a simple query that returns one scalar value.
 * Only use this for queries with NO user input (no ? placeholders).
 * For parameterised queries use a prepared statement directly.
 */
function dbOne($sql, $default = 0) {
    global $conn;
    $r = $conn->query($sql);
    if (!$r) return $default;
    $row = $r->fetch_assoc();
    if (!$row) return $default;
    $v = array_values($row)[0] ?? $default;
    return $v === null ? $default : $v;
}

function getMcId() {
    global $conn;

    /* Try direct blood_bank_id / bank_id in session */
    $bid = $_SESSION['blood_bank_id'] ?? $_SESSION['bank_id'] ?? null;
    if ($bid !== null && is_numeric($bid)) {
        $bid  = (int)$bid;
        $stmt = $conn->prepare("SELECT id FROM blood_bank WHERE id=? AND role='medical_college' AND status<>'blocked' LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('i', $bid);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) { $stmt->close(); return $bid; }
            $stmt->close();
        }
    }

    /* Try user_id */
    $uid = $_SESSION['user_id'] ?? null;
    if ($uid !== null && is_numeric($uid)) {
        $uid  = (int)$uid;
        $stmt = $conn->prepare("SELECT id FROM blood_bank WHERE id=? AND role='medical_college' AND status<>'blocked' LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('i', $uid);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) { $stmt->close(); return $uid; }
            $stmt->close();
        }
    }
    return null;
}

function requireMc() {
    $id = getMcId();
    if ($id) return $id;
    jR([
        'success' => false,
        'error'   => 'AUTH_FAILED',
        'session' => [
            'session_id'    => session_id() ?: 'none',
            'role'          => $_SESSION['role']          ?? 'NOT SET',
            'user_id'       => $_SESSION['user_id']       ?? 'NOT SET',
            'blood_bank_id' => $_SESSION['blood_bank_id'] ?? 'NOT SET',
        ]
    ], 401);
}

if (!isset($conn) || $conn->connect_error) {
    jR(['success' => false, 'error' => 'Database connection failed.'], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'session_debug':      handleSessionDebug();     break;
    case 'dashboard':          handleDashboard();        break;
    case 'requests':           handleRequests();         break;
    case 'submit_request':     handleSubmitRequest();    break;
    case 'track_request':      handleTrackRequest();     break;
    case 'patients':           handlePatients();         break;
    case 'add_patient':        handleAddPatient();       break;
    case 'profile':            handleProfile();          break;
    case 'update_profile':     handleUpdateProfile();    break;
    case 'blood_banks':        handleBloodBanks();       break;
    case 'submit_rating':      handleSubmitRating();     break;
    case 'demand_analytics':   handleDemandAnalytics();  break;
    case 'demand_map':         handleDemandMap();        break;
    case 'logout':                  handleLogout();                  break;
    case 'get_warnings':             handleGetWarnings_mc();          break;
    case 'acknowledge_warning':      handleAcknowledgeWarning_mc();   break;
    case 'submit_improvement':       handleSubmitImprovement_mc();    break;
    case 'appeal_warning':           handleAppealWarning_mc();        break;
    case 'emergency_requests':       handleEmergencyRequestsListMc(); break;
    case 'emergency_approve':        handleEmergencyApproveMc();      break;
    case 'emergency_ignore':         handleEmergencyIgnoreMc();       break;
    case 'my_voice_requests':        handleMyVoiceRequestsMc();       break;
    case 'broadcasts_list':          handleBroadcastsListMc();        break;
    case 'send_emergency_broadcast': handleSendEmergencyBroadcastMc(); break;
    case 'sent_broadcasts':          handleSentBroadcastsMc();        break;
    case 'promises':                 handlePromises();                break;
    case 'verify_promise':           handleVerifyPromise();           break;
    case 'update_promise_status':    handleUpdatePromiseStatus();     break;
    case 'reschedule_promise':       handleReschedulePromise();       break;
    case 'inventory':            handleInventoryMc();         break;
    case 'add_bag':              handleAddBagMc();            break;
    case 'allocate_bag':         handleAllocateBagMc();       break;
    case 'discard_bag':          handleDiscardBagMc();        break;
    case 'pending_requests':     handlePendingRequestsMc();   break;
    case 'accept_request':           handleAcceptRequest();           break;
    case 'reject_request':           handleRejectRequest();           break;
    case 'change_password':          handleChangePasswordMc();        break;
    default:
        jR(['success' => false, 'error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
}

/* ── Emergency Requests (voice) — Medical College ── */
function handleEmergencyRequestsListMc() {
    global $conn;
    $mcId = requireMc();

    /* Exclude self-created broadcasts */
    $res = $conn->query("
        SELECT er.id, er.extracted_blood_group AS blood_group,
               er.extracted_name AS requester_name,
               er.extracted_location AS location,
               er.requester_phone AS phone,
               er.voice_transcript, er.status,
               er.matched_donor_count, er.created_at AS requested_at,
               er.requester_user_id,
               u.full_name AS user_name
        FROM emergency_request er
        LEFT JOIN users u ON u.id = er.requester_user_id
        WHERE er.status = 'pending'
          AND er.requester_user_id != $mcId
        ORDER BY er.created_at DESC
        LIMIT 50
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    /* Check MC blood stock for can_fulfill flag */
    $stockGroups = [];
    $stockRes = $conn->query("
        SELECT DISTINCT blood_group FROM blood_bag
        WHERE blood_bank_id = $mcId
          AND status = 'available'
          AND expiry_date >= CURDATE()
    ");
    if ($stockRes) {
        while ($s = $stockRes->fetch_assoc()) $stockGroups[] = $s['blood_group'];
    }

    foreach ($requests as &$req) {
        $req['can_fulfill'] = !empty($stockGroups) && in_array($req['blood_group'], $stockGroups);
    }
    unset($req);

    jR(['success' => true, 'requests' => $requests]);
}

/* Broadcasts from blood banks */
function handleBroadcastsListMc() {
    global $conn;
    requireMc();

    $res = $conn->query("
        SELECT er.id, er.extracted_blood_group AS blood_group,
               er.extracted_name AS requester_name,
               er.extracted_location AS location,
               er.requester_phone AS phone,
               er.required_units AS units,
               er.matched_donor_count AS recipients_reached,
               er.status, er.created_at AS broadcasted_at,
               COALESCE(bb.name, er.extracted_name) AS bank_name,
               bb.rating_avg AS bank_rating,
               bb.city AS bank_city
        FROM emergency_request er
        LEFT JOIN blood_bank bb ON bb.id = er.requester_user_id
        WHERE er.status = 'pending'
          AND er.requester_user_id IN (
              SELECT id FROM blood_bank WHERE role = 'blood_bank'
          )
        ORDER BY er.created_at DESC
        LIMIT 50
    ");
    $broadcasts = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success' => true, 'broadcasts' => $broadcasts]);
}

function handleEmergencyApproveMc() {
    global $conn;
    $mcId = requireMc();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jR(['success' => false, 'error' => 'request_id required.'], 422);

    /* Get request details */
    $reqRow = $conn->query("SELECT id, extracted_blood_group AS blood_group, requester_user_id, status FROM emergency_request WHERE id = $requestId AND status = 'pending' LIMIT 1");
    if (!$reqRow || !($req = $reqRow->fetch_assoc()))
        jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);

    /* Prevent self-approval */
    if ((int)$req['requester_user_id'] === $mcId)
        jR(['success' => false, 'error' => 'You cannot approve your own emergency broadcast.'], 403);

    /* Check blood stock */
    $bg = $conn->real_escape_string($req['blood_group']);
    $stockCheck = $conn->query("SELECT COUNT(*) AS cnt FROM blood_bag WHERE blood_bank_id = $mcId AND blood_group = '$bg' AND status = 'available' AND expiry_date >= CURDATE()");
    $stock = $stockCheck ? (int)$stockCheck->fetch_assoc()['cnt'] : 0;
    if ($stock < 1)
        jR(['success' => false, 'error' => "Your medical college does not have $bg blood available. Cannot fulfill this request."], 422);

    /* Approve */
    $stmt = $conn->prepare("UPDATE emergency_request SET status = 'assigned', assigned_to_user_id = ?, processed_at = NOW() WHERE id = ? AND status = 'pending'");
    $stmt->bind_param('ii', $mcId, $requestId);
    $stmt->execute();
    if ($stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);
    $stmt->close();

    /* Notify requester */
    if ($req['requester_user_id']) {
        $rid = (int)$req['requester_user_id'];
        $mcInfo = $conn->query("SELECT name, phone FROM blood_bank WHERE id = $mcId LIMIT 1");
        $m = $mcInfo ? $mcInfo->fetch_assoc() : [];
        $mName  = $conn->real_escape_string($m['name']  ?? 'A medical college');
        $mPhone = $conn->real_escape_string($m['phone'] ?? '');
        $conn->query("INSERT INTO notification (user_id, title, message) VALUES ($rid, '✅ Emergency Request Fulfilled', '$mName has confirmed they can provide $bg blood for your emergency request. Contact: $mPhone')");
    }

    jR(['success' => true, 'message' => 'Emergency request approved. Requester has been notified.', 'blood_group' => $bg, 'stock' => $stock]);
}

function handleEmergencyIgnoreMc() {
    global $conn;
    requireMc();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jR(['success' => false, 'error' => 'request_id required.'], 422);

    $stmt = $conn->prepare("UPDATE emergency_request SET status = 'dismissed' WHERE id = ? AND status = 'pending'");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    if ($stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);
    $stmt->close();
    jR(['success' => true, 'message' => 'Emergency request dismissed.']);
}

function handleMyVoiceRequestsMc() {
    global $conn;
    $uid = requireMc();
    $res = $conn->prepare("SELECT id, extracted_blood_group AS blood_group, extracted_name AS requester_name, extracted_location AS location, requester_phone AS phone, voice_transcript, status, matched_donor_count, created_at AS requested_at FROM emergency_request WHERE requester_user_id = ? ORDER BY created_at DESC LIMIT 50");
    $res->bind_param('i', $uid);
    $res->execute();
    $result = $res->get_result();
    $requests = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $res->close();
    jR(['success' => true, 'requests' => $requests]);
}

/* ── Send Emergency Broadcast (Medical College) ── */
function handleSendEmergencyBroadcastMc() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $bloodGroup = trim($data['blood_group'] ?? '');
    $units = (int)($data['units'] ?? 1);
    $notes = trim($data['notes'] ?? '');
    $targets = $data['targets'] ?? [];

    if (!preg_match('/^(A|B|AB|O)[+-]$/', $bloodGroup))
        jR(['success' => false, 'error' => 'Valid blood group required (e.g. A+).'], 422);
    if ($units < 1 || $units > 50) $units = 1;
    if (empty($targets))
        jR(['success' => false, 'error' => 'Select at least one target.'], 422);

    $stmt = $conn->prepare("SELECT name, phone FROM blood_bank WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $mc = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $mcName = $mc['name'] ?? 'Medical College #'.$mcId;
    $mcPhone = $mc['phone'] ?? '';

    $stmt = $conn->prepare("
        INSERT INTO emergency_request
            (requester_user_id, extracted_name, extracted_blood_group,
             extracted_location, requester_phone, required_units,
             status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->bind_param('issssi', $mcId, $mcName, $bloodGroup, $notes, $mcPhone, $units);
    $stmt->execute();
    $emergencyId = $stmt->insert_id;
    $stmt->close();

    $notifiedCount = 0;
    $institutionCount = 0;

    if (in_array('donor_recipient', $targets, true)) {
        $bg = $conn->real_escape_string($bloodGroup);
        $safeName = $conn->real_escape_string($mcName);
        $donors = $conn->query("
            SELECT user_id FROM donor_recipient
            WHERE blood_group = '$bg' AND is_available = 1
            LIMIT 200
        ");
        if ($donors) {
            while ($d = $donors->fetch_assoc()) {
                $did = (int)$d['user_id'];
                $conn->query("INSERT INTO notification (user_id, title, message)
                    VALUES ($did, '🚨 Emergency Blood Request',
                    '🚨 $safeName needs $bg blood urgently. Please respond if you can donate.')");
                $notifiedCount++;
            }
        }
    }

    $excludeId = (int)$mcId;
    $institutionIds = [];

    if (in_array('blood_bank', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $excludeId AND role = 'blood_bank' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }
    if (in_array('hospital', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $excludeId AND role = 'hospital' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }
    if (in_array('medical_college', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $excludeId AND role = 'medical_college' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    $institutionIds = array_unique($institutionIds);
    $institutionCount = count($institutionIds);
    $totalReached = $notifiedCount + $institutionCount;
    $conn->query("UPDATE emergency_request SET matched_donor_count = $totalReached WHERE id = $emergencyId");

    jR([
        'success'     => true,
        'message'     => "🚨 Emergency broadcast sent! $totalReached recipient(s) notified ($notifiedCount donors, $institutionCount institutions).",
        'emergency_id'=> $emergencyId,
        'notified_donors' => $notifiedCount,
        'notified_institutions' => $institutionCount,
    ]);
}

/* ── Sent Broadcasts (Medical College) ── */
function handleSentBroadcastsMc() {
    global $conn;
    $mcId = requireMc();

    $stmt = $conn->prepare("
        SELECT id, extracted_blood_group AS blood_group,
               extracted_name AS requester_name,
               extracted_location AS notes,
               required_units AS units,
               matched_donor_count,
               status, created_at AS sent_at
        FROM emergency_request
        WHERE requester_user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    ");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $broadcasts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'broadcasts' => $broadcasts]);
}

/* ── Session Debug ── */
function handleSessionDebug() {
    jR([
        'success'        => true,
        'session_id'     => session_id() ?: 'none',
        'session'        => $_SESSION,
        'mc_id_resolved' => getMcId()
    ]);
}

/* ── Dashboard ── */
function handleDashboard() {
    global $conn;
    $mcId = requireMc();

    /* College info */
    $stmt = $conn->prepare("SELECT * FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $college = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$college) jR(['success' => false, 'error' => 'Medical college not found.'], 404);

    /* Stats */
    $activeRequests = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcId AND status NOT IN ('delivered','cancelled')");

    /* Total patients: count distinct patients who have a request from this college.
       patient_registry has no hospital_id, so we count via blood_request.
       If you prefer the global registry total, replace with:
       $totalPatients = (int)dbOne("SELECT COUNT(*) FROM patient_registry"); */
    $totalPatients = (int)dbOne("SELECT COUNT(DISTINCT requester_user_id) FROM blood_request WHERE hospital_id=$mcId AND requester_user_id IS NOT NULL");

    $avgRating    = (float)dbOne("SELECT COALESCE(AVG(rating),0) FROM bank_review WHERE blood_bank_id=$mcId");

    /* Recent requests — FIX: blood_request.requester_user_id → users.id (NOT patient_registry.id)
       We try users first, then fall back gracefully. */
    $recentRequests = [];
    $res = $conn->query("
        SELECT br.id, br.blood_group, br.units_required, br.urgency, br.status, br.requested_at,
               COALESCE(u.full_name, pr.full_name, 'Unknown') AS patient_name
        FROM blood_request br
        LEFT JOIN users u  ON u.id  = br.requester_user_id
        LEFT JOIN patient_registry pr ON pr.id = br.requester_user_id
        WHERE br.hospital_id = $mcId
        ORDER BY br.requested_at DESC
        LIMIT 10
    ");
    if ($res) $recentRequests = $res->fetch_all(MYSQLI_ASSOC);

    /* Patient registry summary by blood group (global — no hospital filter in that table) */
    $patientSummary = [];
    $res = $conn->query("SELECT blood_group, COUNT(*) AS total FROM patient_registry GROUP BY blood_group ORDER BY total DESC");
    if ($res) $patientSummary = $res->fetch_all(MYSQLI_ASSOC);

    /* Demand analytics */
    $demandSignals = [];
    $res = $conn->query("
        SELECT blood_group,
               COUNT(*) AS total_requests,
               SUM(CASE WHEN urgency IN ('critical','emergency') THEN 1 ELSE 0 END) AS urgent
        FROM blood_request
        WHERE hospital_id = $mcId
          AND MONTH(requested_at) = MONTH(CURDATE())
          AND YEAR(requested_at)  = YEAR(CURDATE())
        GROUP BY blood_group
        ORDER BY total_requests DESC
        LIMIT 8
    ");
    if ($res) $demandSignals = $res->fetch_all(MYSQLI_ASSOC);

    /* Inventory summary */
    $inventory = [];
    $res = $conn->query("
        SELECT blood_group, COUNT(*) AS total,
            SUM(CASE WHEN expiry_date >= CURDATE()
                      AND DATEDIFF(expiry_date, CURDATE()) <= 7
                     THEN 1 ELSE 0 END) AS expiring7
        FROM blood_bag
        WHERE blood_bank_id = $mcId AND status = 'available'
        GROUP BY blood_group
    ");
    if ($res) $inventory = $res->fetch_all(MYSQLI_ASSOC);

    /* Expiring soon (≤7 days) */
    $expiringSoon = [];
    $res = $conn->query("
        SELECT id, bag_barcode, blood_group, storage_location, volume_ml,
               expiry_date, DATEDIFF(expiry_date, CURDATE()) AS days_left
        FROM blood_bag
        WHERE blood_bank_id = $mcId
          AND status = 'available'
          AND expiry_date >= CURDATE()
          AND DATEDIFF(expiry_date, CURDATE()) <= 7
        ORDER BY expiry_date ASC
        LIMIT 8
    ");
    if ($res) $expiringSoon = $res->fetch_all(MYSQLI_ASSOC);

    jR([
        'success'        => true,
        'college'        => [
            'id'              => (int)$college['id'],
            'name'            => $college['name'],
            'registration_no' => $college['registration_no'] ?? '',
            'email'           => $college['email']           ?? '',
            'phone'           => $college['phone']           ?? '',
            'city'            => $college['city']            ?? '',
            'state'           => $college['state']           ?? '',
            'country'         => $college['country']         ?? 'Bangladesh',
            'status'          => $college['status']          ?? 'active',
            'rating_avg'      => (float)($college['rating_avg'] ?? 0),
            'created_at'      => $college['created_at']      ?? '',
        ],
        'stats' => [
            'active_requests' => $activeRequests,
            'total_patients'  => $totalPatients,
            'avg_rating'      => round($avgRating, 1),
        ],
        'inventory'       => $inventory,
        'expiring_soon'   => $expiringSoon,
        'recent_requests' => $recentRequests,
        'patient_summary' => $patientSummary,
        'demand_signals'  => $demandSignals,
    ]);
}

/* ── Blood Requests list ── */
function handleRequests() {
    global $conn;
    $mcId   = requireMc();
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;

    $where  = ["br.hospital_id = ?"];
    $types  = 'i';
    $params = [$mcId];

    if ($status !== '') {
        $where[] = "br.status = ?";
        $types  .= 's';
        $params[] = $status;
    }
    if ($search !== '') {
        /* FIX: search across users.full_name (not patient_registry) AND blood_group */
        $where[] = "(br.blood_group LIKE ? OR u.full_name LIKE ? OR pr.full_name LIKE ?)";
        $like     = '%' . $search . '%';
        $types   .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $whereSql = implode(' AND ', $where);

    /* Count query */
    $countSql  = "SELECT COUNT(*) AS c
                  FROM blood_request br
                  LEFT JOIN users u ON u.id = br.requester_user_id
                  LEFT JOIN patient_registry pr ON pr.id = br.requester_user_id
                  WHERE $whereSql";
    $countStmt = $conn->prepare($countSql);
    $countStmt->bind_param($types, ...$params);
    $countStmt->execute();
    $totalRows = (int)($countStmt->get_result()->fetch_assoc()['c'] ?? 0);
    $countStmt->close();

    /* Data query — FIX JOIN to users table */
    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, br.required_by, br.notes,
               COALESCE(u.full_name, pr.full_name, 'Unknown') AS patient_name,
               bb.name AS bank_name
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        LEFT JOIN patient_registry pr ON pr.id = br.requester_user_id
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE $whereSql
        ORDER BY br.requested_at DESC
        LIMIT ? OFFSET ?
    ";

    $stmt    = $conn->prepare($sql);
    $types2  = $types . 'ii';
    $params2 = array_merge($params, [$limit, $offset]);
    $stmt->bind_param($types2, ...$params2);
    $stmt->execute();
    $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR([
        'success'    => true,
        'requests'   => $requests,
        'total_rows' => $totalRows,
        'page'       => $page,
        'limit'      => $limit,
    ]);
}

/* ── Submit Blood Request ── */
function handleSubmitRequest() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $patientId  = (isset($data['patient_id']) && is_numeric($data['patient_id'])) ? (int)$data['patient_id'] : null;
    $bloodGroup = trim($data['blood_group'] ?? '');
    $units      = max(1, (int)($data['units'] ?? 1));
    $urgency    = trim($data['urgency']     ?? 'normal');
    $notes      = trim($data['notes']       ?? '');
    $requiredBy = trim($data['required_by'] ?? '');

    if (empty($bloodGroup)) jR(['success' => false, 'error' => 'Blood group is required.'], 422);

    $validUrgency = ['normal', 'critical', 'emergency'];
    if (!in_array($urgency, $validUrgency, true)) $urgency = 'normal';

    $hash  = md5(uniqid($mcId . $bloodGroup, true));
    $reqBy = !empty($requiredBy) ? $requiredBy : null;

    /* FIX: use explicit NULL branch so bind_param handles null patient_id correctly */
    if ($patientId === null) {
        $stmt = $conn->prepare("
            INSERT INTO blood_request
                (hospital_id, requester_user_id, blood_group, units_required, urgency, status, request_hash, requested_at, required_by, notes)
            VALUES
                (?, NULL, ?, ?, ?, 'pending', ?, NOW(), ?, ?)
        ");
        if (!$stmt) jR(['success' => false, 'error' => 'Prepare failed: ' . $conn->error], 500);
        $stmt->bind_param('isissss', $mcId, $bloodGroup, $units, $urgency, $hash, $reqBy, $notes);
    } else {
        $stmt = $conn->prepare("
            INSERT INTO blood_request
                (hospital_id, requester_user_id, blood_group, units_required, urgency, status, request_hash, requested_at, required_by, notes)
            VALUES
                (?, ?, ?, ?, ?, 'pending', ?, NOW(), ?, ?)
        ");
        if (!$stmt) jR(['success' => false, 'error' => 'Prepare failed: ' . $conn->error], 500);
        $stmt->bind_param('iiisssss', $mcId, $patientId, $bloodGroup, $units, $urgency, $hash, $reqBy, $notes);
    }

    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Request failed: ' . $stmt->error], 500);
    $newId = $stmt->insert_id;
    $stmt->close();

    jR(['success' => true, 'message' => 'Blood request submitted successfully.', 'request_id' => $newId]);
}

/* ── Track Request Timeline ── */
function handleTrackRequest() {
    global $conn;
    $mcId = requireMc();
    $id   = (int)($_GET['id'] ?? 0);

    if (!$id) jR(['success' => false, 'error' => 'Request ID required.'], 422);

    $stmt = $conn->prepare("
        SELECT br.*,
               COALESCE(u.full_name, pr.full_name, 'Unknown') AS patient_name,
               bb.name AS bank_name
        FROM blood_request br
        LEFT JOIN users u  ON u.id  = br.requester_user_id
        LEFT JOIN patient_registry pr ON pr.id = br.requester_user_id
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.id = ? AND br.hospital_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('ii', $id, $mcId);
    $stmt->execute();
    $request = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$request) jR(['success' => false, 'error' => 'Request not found.'], 404);

    $timeline = [];
    $res = $conn->query("
        SELECT status, changed_at, remarks
        FROM request_timeline
        WHERE request_id = $id
        ORDER BY changed_at ASC
    ");
    if ($res) $timeline = $res->fetch_all(MYSQLI_ASSOC);

    jR(['success' => true, 'request' => $request, 'timeline' => $timeline]);
}

/* ── Patient Registry ── */
function handlePatients() {
    global $conn;
    requireMc();

    $search = trim($_GET['search']      ?? '');
    $bg     = trim($_GET['blood_group'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;

    $where  = ["1=1"];
    $types  = '';
    $params = [];

    if ($search !== '') {
        $where[] = "(full_name LIKE ? OR phone LIKE ? OR national_id LIKE ?)";
        $like     = '%' . $search . '%';
        $types   .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    if ($bg !== '') {
        $where[] = "blood_group = ?";
        $types   .= 's';
        $params[] = $bg;
    }

    $whereSql = implode(' AND ', $where);

    /* FIX: always use a prepared statement for count so params are bound properly */
    if (empty($params)) {
        $total = (int)dbOne("SELECT COUNT(*) FROM patient_registry WHERE $whereSql");
    } else {
        $cStmt = $conn->prepare("SELECT COUNT(*) AS c FROM patient_registry WHERE $whereSql");
        $cStmt->bind_param($types, ...$params);
        $cStmt->execute();
        $total = (int)($cStmt->get_result()->fetch_assoc()['c'] ?? 0);
        $cStmt->close();
    }

    $sql  = "SELECT * FROM patient_registry WHERE $whereSql ORDER BY created_at DESC LIMIT ? OFFSET ?";
    $stmt = $conn->prepare($sql);
    if (empty($params)) {
        $stmt->bind_param('ii', $limit, $offset);
    } else {
        $t2 = $types . 'ii';
        $p2 = array_merge($params, [$limit, $offset]);
        $stmt->bind_param($t2, ...$p2);
    }
    $stmt->execute();
    $patients = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    /* Summary by blood group */
    $summary = [];
    $res = $conn->query("SELECT blood_group, COUNT(*) AS total FROM patient_registry GROUP BY blood_group ORDER BY total DESC");
    if ($res) $summary = $res->fetch_all(MYSQLI_ASSOC);

    jR([
        'success'    => true,
        'patients'   => $patients,
        'total_rows' => $total,
        'summary'    => $summary,
        'page'       => $page,
        'limit'      => $limit,
    ]);
}

/* ── Add Patient ── */
function handleAddPatient() {
    global $conn;
    requireMc();
    $data = reqBody();

    $fullName   = trim($data['full_name']     ?? '');
    $bloodGroup = trim($data['blood_group']   ?? '');
    $dob        = trim($data['date_of_birth'] ?? '');
    $phone      = trim($data['phone']         ?? '');
    $nationalId = trim($data['national_id']   ?? '') ?: null;
    $address    = trim($data['address']       ?? '');

    if (empty($fullName))   jR(['success' => false, 'error' => 'Full name is required.'],   422);
    if (empty($bloodGroup)) jR(['success' => false, 'error' => 'Blood group is required.'], 422);
    if (empty($phone))      jR(['success' => false, 'error' => 'Phone is required.'],       422);

    /* Check duplicate national ID */
    if ($nationalId) {
        $chk = $conn->prepare("SELECT id FROM patient_registry WHERE national_id=? LIMIT 1");
        $chk->bind_param('s', $nationalId);
        $chk->execute();
        $chk->store_result();
        if ($chk->num_rows > 0) {
            $chk->close();
            jR(['success' => false, 'error' => 'National ID already registered.'], 409);
        }
        $chk->close();
    }

    $stmt = $conn->prepare("
        INSERT INTO patient_registry (national_id, full_name, blood_group, date_of_birth, phone, address)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    if (!$stmt) jR(['success' => false, 'error' => 'Prepare failed: ' . $conn->error], 500);

    $dobVal = !empty($dob) ? $dob : null;
    $stmt->bind_param('ssssss', $nationalId, $fullName, $bloodGroup, $dobVal, $phone, $address);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Failed to register patient: ' . $stmt->error], 500);

    $newId = $stmt->insert_id;
    $stmt->close();

    jR(['success' => true, 'message' => 'Patient registered successfully.', 'patient_id' => $newId]);
}

/* ── Profile ── */
function handleProfile() {
    global $conn;
    $mcId = requireMc();

    $stmt = $conn->prepare("SELECT * FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$profile) jR(['success' => false, 'error' => 'Profile not found.'], 404);

    $totalRequests  = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcId");
    $totalPatients  = (int)dbOne("SELECT COUNT(*) FROM patient_registry");
    $totalPromises  = (int)dbOne("SELECT COUNT(*) FROM donation_promise WHERE blood_bank_id=$mcId");
    $avgRating      = (float)dbOne("SELECT COALESCE(AVG(rating),0) FROM bank_review WHERE blood_bank_id=$mcId");

    $responded   = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcId AND status NOT IN ('pending','cancelled')");
    $fulfilled   = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcId AND status='delivered'");
    $responseRate = $totalRequests > 0 ? round(($responded / $totalRequests) * 100) : 0;
    $fulfillRate  = $totalRequests > 0 ? round(($fulfilled / $totalRequests) * 100) : 0;
    $qualityScore = min(100, round(($responseRate + $fulfillRate) / 2));

    jR([
        'success'         => true,
        'profile'         => $profile,
        'total_requests'  => $totalRequests,
        'total_patients'  => $totalPatients,
        'total_promises'  => $totalPromises,
        'avg_rating'      => round($avgRating, 1),
        'response_rate'   => $responseRate,
        'fulfillment_rate'=> $fulfillRate,
        'quality_score'   => $qualityScore,
    ]);
}

/* ── Update Profile ── */
function handleUpdateProfile() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $name    = trim($data['name']         ?? '');
    $email   = trim($data['email']        ?? '');
    $phone   = trim($data['phone']        ?? '');
    $address = trim($data['address_line'] ?? '');
    $city    = trim($data['city']         ?? '');
    $state   = trim($data['state']        ?? '');
    $country = trim($data['country']      ?? 'Bangladesh');

    if (strlen($name) < 2)                         jR(['success' => false, 'error' => 'Name too short.'], 422);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jR(['success' => false, 'error' => 'Invalid email.'], 422);

    $stmt = $conn->prepare("
        UPDATE blood_bank SET name=?, email=?, phone=?, address_line=?, city=?, state=?, country=?
        WHERE id=?
    ");
    $stmt->bind_param('sssssssi', $name, $email, $phone, $address, $city, $state, $country, $mcId);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Update failed: ' . $stmt->error], 500);
    $stmt->close();

    jR(['success' => true, 'message' => 'Profile updated successfully.']);
}

/* ── Change Password ── */
function handleChangePasswordMc() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $currentPw = trim($data['current_password'] ?? '');
    $newPw     = trim($data['new_password'] ?? '');

    if ($currentPw === '' || $newPw === '') {
        jR(['success' => false, 'error' => 'All fields are required.'], 422);
    }
    if (strlen($newPw) < 8) {
        jR(['success' => false, 'error' => 'Password must be at least 8 characters.'], 422);
    }

    $stmt = $conn->prepare("SELECT password FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        jR(['success' => false, 'error' => 'User not found.'], 404);
    }

    if (!password_verify($currentPw, $row['password'])) {
        jR(['success' => false, 'error' => 'Current password is incorrect.'], 403);
    }

    $hash = password_hash($newPw, PASSWORD_DEFAULT);
    $upd  = $conn->prepare("UPDATE blood_bank SET password=? WHERE id=?");
    $upd->bind_param('si', $hash, $mcId);
    if (!$upd->execute()) {
        jR(['success' => false, 'error' => 'Password update failed: ' . $upd->error], 500);
    }
    $upd->close();

    jR(['success' => true, 'message' => 'Password changed successfully.']);
}

/* ── Blood Banks list (for rating) ── */
function handleBloodBanks() {
    global $conn;
    requireMc();

    $res = $conn->query("
        SELECT id, name, city, rating_avg
        FROM blood_bank
        WHERE role = 'blood_bank' AND status = 'active'
        ORDER BY name ASC
    ");
    $banks = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success' => true, 'banks' => $banks]);
}

/* ── Submit Rating ── */
function handleSubmitRating() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $bankId     = (int)($data['bank_id']    ?? 0);
    $rating     = max(1, min(5, (int)($data['rating'] ?? 5)));
    $reviewText = trim($data['review_text'] ?? '');

    if (!$bankId) jR(['success' => false, 'error' => 'Bank ID is required.'], 422);

    $stmt = $conn->prepare("
        INSERT INTO bank_review (blood_bank_id, reviewer_user_id, rating, review_text)
        VALUES (?, ?, ?, ?)
    ");
    if (!$stmt) jR(['success' => false, 'error' => 'Prepare failed: ' . $conn->error], 500);
    $stmt->bind_param('iiis', $bankId, $mcId, $rating, $reviewText);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Rating failed: ' . $stmt->error], 500);
    $stmt->close();

    /* Update rating_avg */
    $avg = (float)dbOne("SELECT AVG(rating) FROM bank_review WHERE blood_bank_id=$bankId");
    $conn->query("UPDATE blood_bank SET rating_avg=$avg WHERE id=$bankId");

    jR(['success' => true, 'message' => 'Rating submitted successfully.']);
}

/* ── Demand Analytics ── */
function handleDemandAnalytics() {
    global $conn;
    $mcId = requireMc();

    $mcIdEsc = (int)$mcId;

    /* Summary stats */
    $totalRequests   = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcIdEsc");
    $pendingRequests = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcIdEsc AND status='pending'");
    $urgentRequests  = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcIdEsc AND urgency IN ('critical','emergency') AND status='pending'");
    $fulfilledCount  = (int)dbOne("SELECT COUNT(*) FROM blood_request WHERE hospital_id=$mcIdEsc AND status='approved'");
    $totalUnits      = (int)dbOne("SELECT COALESCE(SUM(units_required),0) FROM blood_request WHERE hospital_id=$mcIdEsc AND MONTH(requested_at)=MONTH(CURDATE()) AND YEAR(requested_at)=YEAR(CURDATE())");
    $uniqueGroups    = (int)dbOne("SELECT COUNT(DISTINCT blood_group) FROM blood_request WHERE hospital_id=$mcIdEsc");

    /* By blood group this month */
    $byGroup = [];
    $res = $conn->query("
        SELECT blood_group,
               COUNT(*) AS total_requests,
               SUM(CASE WHEN urgency IN ('critical','emergency') THEN 1 ELSE 0 END) AS urgent,
               SUM(units_required) AS total_units
        FROM blood_request
        WHERE hospital_id = $mcIdEsc
          AND MONTH(requested_at) = MONTH(CURDATE())
          AND YEAR(requested_at)  = YEAR(CURDATE())
        GROUP BY blood_group
        ORDER BY total_requests DESC
    ");
    if ($res) $byGroup = $res->fetch_all(MYSQLI_ASSOC);

    /* Monthly trend (last 6 months) */
    $trend = [];
    $res = $conn->query("
        SELECT DATE_FORMAT(requested_at,'%b %Y') AS month_label,
               COUNT(*) AS total,
               SUM(CASE WHEN urgency IN ('critical','emergency') THEN 1 ELSE 0 END) AS urgent
        FROM blood_request
        WHERE hospital_id = $mcIdEsc
          AND requested_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY YEAR(requested_at), MONTH(requested_at)
        ORDER BY YEAR(requested_at) ASC, MONTH(requested_at) ASC
    ");
    if ($res) $trend = $res->fetch_all(MYSQLI_ASSOC);

    /* Status breakdown */
    $statusBreakdown = [];
    $res = $conn->query("
        SELECT status, COUNT(*) AS total
        FROM blood_request
        WHERE hospital_id = $mcIdEsc
        GROUP BY status
    ");
    if ($res) $statusBreakdown = $res->fetch_all(MYSQLI_ASSOC);

    jR([
        'success'          => true,
        'summary'          => [
            'total_requests'   => $totalRequests,
            'pending'          => $pendingRequests,
            'urgent'           => $urgentRequests,
            'fulfilled'        => $fulfilledCount,
            'total_units'      => $totalUnits,
            'unique_groups'    => $uniqueGroups,
        ],
        'by_group'         => $byGroup,
        'trend'            => $trend,
        'status_breakdown' => $statusBreakdown,
    ]);
}

/* ── Demand Map — get MC location + nearby banks + request signals ── */
function handleDemandMap() {
    global $conn;
    $mcId = requireMc();

    /* MC profile (location) */
    $stmt = $conn->prepare("SELECT id, name, latitude, longitude, address_line, city, state FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $mcId);
    $stmt->execute();
    $mcProfile = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $mcLat = $mcProfile ? ((float)($mcProfile['latitude'] ?? 0)) : 23.7642;
    $mcLng = $mcProfile ? ((float)($mcProfile['longitude'] ?? 0)) : 90.3800;

    /* Nearby blood banks with location */
    $nearbyBanks = [];
    $res = $conn->query("
        SELECT id, name, address_line, city, latitude, longitude, phone, rating_avg
        FROM blood_bank
        WHERE id != $mcId
          AND latitude IS NOT NULL AND longitude IS NOT NULL
          AND latitude != 0 AND longitude != 0
          AND status <> 'blocked'
        LIMIT 50
    ");
    if ($res) $nearbyBanks = $res->fetch_all(MYSQLI_ASSOC);

    /* Demand signals as map markers (by blood group with counts) */
    $demandMarkers = [];
    $res = $conn->query("
        SELECT blood_group,
               COUNT(*) AS total_requests,
               SUM(CASE WHEN urgency IN ('critical','emergency') THEN 1 ELSE 0 END) AS urgent,
               SUM(units_required) AS total_units
        FROM blood_request
        WHERE hospital_id = $mcId
          AND MONTH(requested_at) = MONTH(CURDATE())
          AND YEAR(requested_at)  = YEAR(CURDATE())
        GROUP BY blood_group
        ORDER BY total_requests DESC
    ");
    if ($res) $demandMarkers = $res->fetch_all(MYSQLI_ASSOC);

    jR([
        'success'      => true,
        'mc_location'  => [
            'id'        => $mcId,
            'name'      => $mcProfile['name'] ?? 'My Location',
            'lat'       => $mcLat,
            'lng'       => $mcLng,
            'address'   => ($mcProfile['address_line'] ?? '') . ', ' . ($mcProfile['city'] ?? ''),
        ],
        'nearby_banks' => $nearbyBanks,
        'demand_signals' => $demandMarkers,
    ]);
}

/* ── Logout ── */
function handleLogout() {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    jR(['success' => true, 'message' => 'Logged out.']);
}

/* ============================================================
   ADMIN WARNING HANDLERS — mc
   ============================================================ */
function _twE_mc($t){global $conn;$r=$conn->query("SHOW TABLES LIKE '".$conn->real_escape_string($t)."'");return $r&&$r->num_rows>0;}
function _cwE_mc($t,$c){global $conn;$r=$conn->query("SHOW COLUMNS FROM `".str_replace('`','',$t)."` LIKE '".$conn->real_escape_string($c)."'");return $r&&$r->num_rows>0;}

function handleGetWarnings_mc(){
    global $conn; $uid=requireMc();
    if(!_twE_mc('admin_warning')) jR(['success'=>true,'warnings'=>[],'warning_count'=>0]);
    $d=_cwE_mc('admin_warning','is_dismissed')?"AND (is_dismissed=0 OR is_dismissed IS NULL)":"";
    $s=$conn->prepare("SELECT id,message,status,sent_at,response,responded_at FROM admin_warning WHERE target_type='blood_bank' AND target_id=? $d ORDER BY sent_at DESC");
    if(!$s) jR(['success'=>false,'error'=>$conn->error],500);
    $s->bind_param('i',$uid);$s->execute();$w=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    jR(['success'=>true,'warnings'=>$w,'warning_count'=>count($w)]);
}

function handleAcknowledgeWarning_mc(){
    global $conn; $uid=requireMc();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_mc('admin_warning','is_dismissed')){
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=?,is_dismissed=1,action_taken='acknowledged' WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Warning acknowledged.']);
}

function handleSubmitImprovement_mc(){
    global $conn; $uid=requireMc();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$plan=trim($data['plan']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($plan)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_mc('admin_warning','improvement_plan')){
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=?,is_dismissed=1,action_taken='improvement_submitted',improvement_plan=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$plan,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Improvement plan submitted.']);
}

function handleAppealWarning_mc(){
    global $conn; $uid=requireMc();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$reason=trim($data['reason']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($reason)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_mc('admin_warning','appeal_reason')){
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=?,is_dismissed=1,action_taken='appealed',appeal_reason=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$reason,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Appeal submitted.']);
}

/* ── Helper: create notification for a user ── */
function notifyUser($userId, $title, $message) {
    global $conn;
    if (!$userId) return;
    $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message, created_at) VALUES (?, ?, ?, NOW())");
    if (!$stmt) return;
    $stmt->bind_param('iss', $userId, $title, $message);
    $stmt->execute();
    $stmt->close();
}

/* ══════════════════════════════════════════════════════════
   PROMISES — donor promises to this medical college's blood bank
═══════════════════════════════════════════════════════════ */

function handlePromises() {
    global $conn;
    $mcId = requireMc();
    $status = trim($_GET['status'] ?? '');

    $where = "dp.blood_bank_id = ?";
    $types = 'i';
    $params = [$mcId];

    if ($status !== '') {
        $where .= " AND dp.status = ?";
        $types .= 's';
        $params[] = $status;
    }

    $sql = "
        SELECT 
            dp.*,
            u.full_name AS donor_name,
            dr.blood_group
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE $where
        ORDER BY dp.promise_time DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) jR(['success' => false, 'error' => 'Promises query failed: ' . $conn->error], 500);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $promises = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'promises' => $promises]);
}

function handleVerifyPromise() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $code = trim($data['confirmation_code'] ?? '');
    if ($code === '') jR(['success' => false, 'error' => 'Confirmation code is required.'], 422);

    $stmt = $conn->prepare("
        SELECT 
            dp.*,
            u.full_name AS donor_name,
            dr.blood_group
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE dp.blood_bank_id = ? AND dp.confirmation_code = ?
        LIMIT 1
    ");
    if (!$stmt) jR(['success' => false, 'error' => 'Verify query failed: ' . $conn->error], 500);
    $stmt->bind_param('is', $mcId, $code);
    $stmt->execute();
    $promise = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$promise) jR(['success' => false, 'error' => 'Promise code not found for this medical college.'], 404);

    jR(['success' => true, 'promise' => $promise]);
}

function handleUpdatePromiseStatus() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $promiseId = (int)($data['promise_id'] ?? 0);
    $status    = trim($data['status'] ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!in_array($status, ['fulfilled','broken'], true)) jR(['success'=>false,'error'=>'Status must be fulfilled or broken.'],422);

    $chk = $conn->prepare("SELECT id, donor_user_id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $mcId);
    $chk->execute();
    $promiseRow = $chk->get_result()->fetch_assoc();
    $chk->close();
    if (!$promiseRow) jR(['success'=>false,'error'=>'Promise not found.'],404);

    $donorId = (int)$promiseRow['donor_user_id'];
    $now = date('Y-m-d H:i:s');

    if ($status === 'fulfilled') {
        $stmt = $conn->prepare("UPDATE donation_promise SET status='fulfilled', fulfilled_at=? WHERE id=?");
        $stmt->bind_param('si', $now, $promiseId);
    } else {
        $stmt = $conn->prepare("UPDATE donation_promise SET status='broken', broken_at=? WHERE id=?");
        $stmt->bind_param('si', $now, $promiseId);
    }
    if (!$stmt->execute()) jR(['success'=>false,'error'=>$stmt->error],500);
    $stmt->close();

    if ($status === 'broken') {
        $conn->query("
            UPDATE donor_recipient dr
            JOIN donation_promise dp ON dp.donor_user_id = dr.user_id
            SET dr.trust_score = GREATEST(0, dr.trust_score - 10)
            WHERE dp.id = $promiseId
        ");
    }

    if ($status === 'fulfilled') {
        $conn->query("
            UPDATE donor_recipient dr
            JOIN donation_promise dp ON dp.donor_user_id = dr.user_id
            SET dr.trust_score = LEAST(100, dr.trust_score + 5)
            WHERE dp.id = $promiseId
        ");

        if ($donorId) {
            $ins = $conn->prepare("
                INSERT INTO donation (donor_user_id, blood_bank_id, donation_promise_id, donation_date, status, created_at)
                VALUES (?, ?, ?, NOW(), 'completed', NOW())
            ");
            if ($ins) {
                $ins->bind_param('iii', $donorId, $mcId, $promiseId);
                $ins->execute();
                $donationId = $ins->insert_id;
                $ins->close();

                $conn->query("
                    UPDATE donor_recipient
                    SET total_donations = (SELECT COUNT(*) FROM donation_promise WHERE donor_user_id = $donorId AND status = 'fulfilled'),
                        last_donation_date = NOW()
                    WHERE user_id = $donorId
                ");

                $barcode    = 'BB-' . strtoupper(substr(md5(uniqid((string)$donorId, true)), 0, 8));
                $expiryDate = date('Y-m-d', strtotime('+42 days'));
                $bgRes      = $conn->query("SELECT blood_group FROM donor_recipient WHERE user_id=$donorId LIMIT 1");
                $bloodGroup = ($bgRes && ($bgRow = $bgRes->fetch_assoc())) ? ($bgRow['blood_group'] ?? 'O+') : 'O+';

                $bagStmt = $conn->prepare("
                    INSERT INTO blood_bag (blood_bank_id, bag_barcode, blood_group, donation_id, volume_ml, collection_date, expiry_date, status, storage_location, culture_test_status, created_at)
                    VALUES (?, ?, ?, ?, 450, NOW(), ?, 'available', 'Freezer A1', 'pending', NOW())
                ");
                if ($bagStmt) {
                    $bagStmt->bind_param('issis', $mcId, $barcode, $bloodGroup, $donationId, $expiryDate);
                    $bagStmt->execute();
                    $bagStmt->close();
                }
            }
        }
    }

    jR(['success'=>true,'message'=>'Promise status updated to ' . $status . '.']);
}

function handleReschedulePromise() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $promiseId = (int)($data['promise_id'] ?? 0);
    $newDate   = trim($data['new_date'] ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!$newDate)   jR(['success'=>false,'error'=>'new_date required.'],422);

    $ts = strtotime($newDate);
    if (!$ts) jR(['success'=>false,'error'=>'Invalid date format.'],422);
    $formatted = date('Y-m-d H:i:s', $ts);

    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $mcId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jR(['success'=>false,'error'=>'Promise not found.'],404);
    $chk->close();

    $stmt = $conn->prepare("UPDATE donation_promise SET promise_time=?, status='pending' WHERE id=?");
    $stmt->bind_param('si', $formatted, $promiseId);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>$stmt->error],500);
    $stmt->close();

    jR(['success'=>true,'message'=>'Promise rescheduled successfully.']);
}

/* ══════════════════════════════════════════════════════════
   INCOMING BLOOD REQUESTS — for this medical college's blood bank
═══════════════════════════════════════════════════════════ */

function handlePendingRequestsMc() {
    global $conn;
    $mcId = requireMc();

    $status  = trim($_GET['status'] ?? 'pending');
    $allowed = ['pending', 'approved', 'rejected', 'all'];
    if (!in_array($status, $allowed, true)) $status = 'pending';

    $where  = "br.blood_bank_id = ?";
    $types  = 'i';
    $params = [$mcId];

    if ($status !== 'all') {
        $where .= " AND br.status = ?";
        $types .= 's';
        $params[] = $status;
    }

    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency, br.status,
               br.requested_at, br.approved_at, br.notes, br.visible_to,
               u.full_name AS requester_name, u.phone AS requester_phone
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        WHERE $where
        ORDER BY FIELD(br.urgency,'emergency','urgent','normal'), br.requested_at DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) jR(['success' => false, 'error' => 'Query failed: ' . $conn->error], 500);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (!empty($requests)) {
        $ids = implode(',', array_map(fn($r) => (int)$r['id'], $requests));
        $offerRows = $conn->query("
            SELECT entity_id, status AS offer_status
            FROM approval_step
            WHERE entity_type = 'blood_request' AND entity_id IN ($ids) AND approver_user_id = $mcId
        ");
        $offerMap = [];
        if ($offerRows) {
            while ($or = $offerRows->fetch_assoc()) {
                $offerMap[(int)$or['entity_id']] = $or['offer_status'];
            }
        }
        $countRows = $conn->query("
            SELECT entity_id, COUNT(*) AS offer_count
            FROM approval_step
            WHERE entity_type = 'blood_request' AND entity_id IN ($ids) AND status IN ('pending','approved')
            GROUP BY entity_id
        ");
        $countMap = [];
        if ($countRows) {
            while ($cr = $countRows->fetch_assoc()) {
                $countMap[(int)$cr['entity_id']] = (int)$cr['offer_count'];
            }
        }
        foreach ($requests as &$req) {
            $rid = (int)$req['id'];
            $req['bank_offer_status'] = $offerMap[$rid] ?? null;
            $req['bank_offer_count']  = $countMap[$rid] ?? 0;
        }
        unset($req);
    }

    jR(['success' => true, 'requests' => $requests]);
}

function handleAcceptRequest() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $requestId    = (int)($data['request_id'] ?? 0);
    $notes        = trim($data['notes'] ?? '');
    $pricePerUnit = isset($data['price_per_unit']) && (float)$data['price_per_unit'] > 0 ? (float)$data['price_per_unit'] : null;

    if (!$requestId) jR(['success' => false, 'error' => 'request_id is required.'], 422);

    $stmt = $conn->prepare("
        SELECT id, blood_group, units_required, status, requester_user_id, visible_to,
               request_type, max_price_per_unit
        FROM blood_request
        WHERE id = ? AND blood_bank_id = ? AND status = 'pending'
        LIMIT 1
    ");
    $stmt->bind_param('ii', $requestId, $mcId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) jR(['success' => false, 'error' => 'Request not found, not assigned to this bank, or already processed.'], 404);

    if ($req['visible_to'] === 'donor_recipient') {
        jR(['success' => false, 'error' => 'This request is for donors only.'], 403);
    }

    $reqType  = $req['request_type'] ?? 'free';
    $maxPrice = (float)($req['max_price_per_unit'] ?? 0);
    if ($reqType === 'free' && $pricePerUnit > 0) {
        jR(['success' => false, 'error' => 'This request only accepts free blood supply. Remove your price to proceed.'], 422);
    }
    if (in_array($reqType, ['paid','open'], true) && $maxPrice > 0 && $pricePerUnit > $maxPrice) {
        jR(['success' => false, 'error' => "Your price (৳$pricePerUnit/unit) exceeds the requester's maximum (৳$maxPrice/unit)."], 422);
    }

    $stock = (int)dbOne("
        SELECT COUNT(*) AS c FROM blood_bag
        WHERE blood_bank_id = $mcId
          AND blood_group = '" . $conn->real_escape_string($req['blood_group']) . "'
          AND status = 'available'
          AND expiry_date > CURDATE()
          AND culture_test_status <> 'failed'
    ", 0);

    if ($stock < (int)$req['units_required']) {
        jR(['success' => false, 'error' => "Insufficient stock. You have $stock unit(s) available but " . (int)$req['units_required'] . " required."], 422);
    }

    $dupChk = $conn->query("
        SELECT id FROM approval_step
        WHERE entity_type = 'blood_request' AND entity_id = $requestId
          AND approver_user_id = $mcId AND status IN ('pending','approved')
        LIMIT 1
    ");
    if ($dupChk && $dupChk->fetch_assoc()) {
        jR(['success' => false, 'error' => 'You have already offered blood for this request.'], 409);
    }

    $offerNote = $notes ?: 'Medical college has offered to fulfil this request.';
    $ppuVal    = $pricePerUnit !== null ? $pricePerUnit : 'NULL';
    $totalUnits = (int)$req['units_required'];

    $insertOk = $conn->query("
        INSERT INTO approval_step
            (entity_id, entity_type, approver_user_id, step_order, status, comments, price_per_unit, total_units, created_at)
        VALUES
            ($requestId, 'blood_request', $mcId, 1, 'pending',
             '" . $conn->real_escape_string($offerNote) . "',
             $ppuVal, $totalUnits, NOW())
    ");
    if (!$insertOk) jR(['success' => false, 'error' => 'Could not record offer: ' . $conn->error], 500);

    $bankNameRow = $conn->query("SELECT name FROM blood_bank WHERE id=$mcId LIMIT 1");
    $bankName = ($bankNameRow && ($bn = $bankNameRow->fetch_assoc())) ? $bn['name'] : 'A medical college';
    $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);

    if (!empty($req['requester_user_id'])) {
        $priceNote = ($pricePerUnit && $pricePerUnit > 0)
            ? " They are offering at ৳" . number_format($pricePerUnit, 0) . " per unit."
            : " This is a free supply offer.";
        notifyUser(
            (int)$req['requester_user_id'],
            '🏥 Blood Bank Offer Received',
            "$bankName has offered to fulfil your blood request #REQ-$reqNo for " . $req['blood_group'] . ".$priceNote Open your request timeline to review and accept."
        );
    }

    jR([
        'success'       => true,
        'message'       => 'Your offer has been submitted. The requester will review and select from available offers.',
        'request_id'    => $requestId,
        'price_per_unit'=> $pricePerUnit,
    ]);
}

function handleRejectRequest() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $requestId = (int)($data['request_id'] ?? 0);
    $reason    = trim($data['reason'] ?? '');

    if (!$requestId) jR(['success' => false, 'error' => 'request_id is required.'], 422);

    $stmt = $conn->prepare("
        SELECT id, requester_user_id, blood_group
        FROM blood_request
        WHERE id = ? AND blood_bank_id = ? AND status = 'pending'
        LIMIT 1
    ");
    $stmt->bind_param('ii', $requestId, $mcId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) jR(['success' => false, 'error' => 'Request not found, not assigned to this bank, or already processed.'], 404);

    $stmt = $conn->prepare("UPDATE blood_request SET status = 'rejected' WHERE id = ? AND blood_bank_id = ? AND status = 'pending'");
    $stmt->bind_param('ii', $requestId, $mcId);
    if (!$stmt->execute() || $stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Could not reject request.'], 500);
    $stmt->close();

    if (!empty($req['requester_user_id'])) {
        $msg = "Your blood request #REQ-" . str_pad($requestId, 4, '0', STR_PAD_LEFT) . " for " . $req['blood_group'] . " was not accepted.";
        if ($reason) $msg .= " Reason: $reason";
        notifyUser((int)$req['requester_user_id'], 'Blood Request Not Accepted', $msg);
    }

    jR(['success' => true, 'message' => 'Request rejected.', 'request_id' => $requestId]);
}

/* ── INVENTORY (mirrors bank) ── */
function handleInventoryMc() {
    global $conn;
    $mcId = requireMc();

    $type   = trim($_GET['type'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;

    $where  = ["bg.blood_bank_id = ?"];
    $types  = 'i';
    $params = [$mcId];

    if ($type !== '') {
        $where[] = "bg.blood_group = ?";
        $types .= 's';
        $params[] = $type;
    }
    if ($status !== '') {
        $where[] = "bg.status = ?";
        $types .= 's';
        $params[] = $status;
    }
    if ($search !== '') {
        $where[] = "(bg.bag_barcode LIKE ? OR bg.blood_group LIKE ? OR u.full_name LIKE ?)";
        $like = '%' . $search . '%';
        $types .= 'sss';
        $params[] = $like; $params[] = $like; $params[] = $like;
    }

    $whereSql = implode(' AND ', $where);

    $byGroup = [];
    $stmt = $conn->prepare("SELECT blood_group, COUNT(*) AS total, SUM(CASE WHEN expiry_date >= CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= 7 THEN 1 ELSE 0 END) AS expiring7 FROM blood_bag WHERE blood_bank_id = ? AND status = 'available' GROUP BY blood_group");
    if ($stmt) { $stmt->bind_param('i', $mcId); $stmt->execute(); $byGroup = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $stmt->close(); }

    $totals = [
        'total'       => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $mcId", 0),
        'expiring7'   => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $mcId AND expiry_date >= CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= 7", 0),
        'quarantined' => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $mcId AND status = 'quarantined'", 0),
        'available'   => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $mcId AND status = 'available'", 0)
    ];

    $stmt = $conn->prepare("SELECT COUNT(*) AS c FROM blood_bag bg LEFT JOIN donation dn ON dn.id = bg.donation_id LEFT JOIN users u ON u.id = dn.donor_user_id WHERE $whereSql");
    if (!$stmt) jR(['success' => false, 'error' => 'Inventory count failed: ' . $conn->error], 500);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $totalRows = (int)($stmt->get_result()->fetch_assoc()['c'] ?? 0);
    $stmt->close();

    $stmt = $conn->prepare("SELECT bg.*, DATEDIFF(bg.expiry_date, CURDATE()) AS days_to_expiry, COALESCE(u.full_name, '—') AS donor_name FROM blood_bag bg LEFT JOIN donation dn ON dn.id = bg.donation_id LEFT JOIN users u ON u.id = dn.donor_user_id WHERE $whereSql ORDER BY bg.expiry_date ASC, bg.id DESC LIMIT ? OFFSET ?");
    if (!$stmt) jR(['success' => false, 'error' => 'Inventory query failed: ' . $conn->error], 500);
    $types2 = $types . 'ii';
    $params2 = array_merge($params, [$limit, $offset]);
    $stmt->bind_param($types2, ...$params2);
    $stmt->execute();
    $bags = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'by_group' => $byGroup, 'totals' => $totals, 'bags' => $bags, 'total_rows' => $totalRows, 'limit' => $limit, 'page' => $page]);
}

function handleAddBagMc() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();

    $barcode    = trim($data['bag_barcode'] ?? $data['bagId'] ?? '');
    $bloodGroup = trim($data['blood_group'] ?? $data['type'] ?? '');
    $donorName  = trim($data['donor_name'] ?? $data['donorId'] ?? '');
    $expiry     = trim($data['expiry_date'] ?? $data['expiry'] ?? '');
    $storage    = trim($data['storage_location'] ?? $data['storage'] ?? '');
    $volume     = (int)($data['volume_ml'] ?? 450);

    if (!$barcode)   jR(['success' => false, 'error' => 'Bag barcode is required.'], 422);
    if (!$bloodGroup) jR(['success' => false, 'error' => 'Blood group is required.'], 422);
    if (!$expiry)    jR(['success' => false, 'error' => 'Expiry date is required.'], 422);

    $donationId = null;
    if ($donorName) {
        $stmt = $conn->prepare("
            SELECT dp.id FROM donation_promise dp
            JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
            JOIN users u ON u.id = dr.user_id
            WHERE u.full_name LIKE ? AND dp.blood_bank_id = ?
            ORDER BY dp.promise_time DESC LIMIT 1
        ");
        $likeName = '%' . $donorName . '%';
        $stmt->bind_param('si', $likeName, $mcId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $donationId = $result ? (int)$result['id'] : null;
        $stmt->close();
    }

    $stmt = $conn->prepare("INSERT INTO blood_bag (blood_bank_id, bag_barcode, blood_group, donation_id, volume_ml, collection_date, expiry_date, status, storage_location, culture_test_status) VALUES (?, ?, ?, ?, 450, CURDATE(), ?, 'available', ?, 'pending')");
    $stmt->bind_param('ississ', $mcId, $barcode, $bloodGroup, $donationId, $expiry, $storage);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Failed to add bag: ' . $stmt->error], 500);
    $bagId = $conn->insert_id;
    $stmt->close();

    jR(['success' => true, 'message' => "Bag #$barcode added successfully.", 'bag_id' => $bagId]);
}

function handleAllocateBagMc() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();
    $bagId = (int)($data['bag_id'] ?? 0);
    if (!$bagId) jR(['success' => false, 'error' => 'bag_id is required.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status = 'reserved' WHERE id = ? AND blood_bank_id = ? AND status = 'available'");
    $stmt->bind_param('ii', $bagId, $mcId);
    if (!$stmt->execute() || $stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Bag not found or already allocated.'], 404);
    $stmt->close();

    jR(['success' => true, 'message' => 'Bag marked as reserved.']);
}

function handleDiscardBagMc() {
    global $conn;
    $mcId = requireMc();
    $data = reqBody();
    $bagId = (int)($data['bag_id'] ?? 0);
    if (!$bagId) jR(['success' => false, 'error' => 'bag_id is required.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status = 'discarded' WHERE id = ? AND blood_bank_id = ? AND status IN ('available','quarantined')");
    $stmt->bind_param('ii', $bagId, $mcId);
    if (!$stmt->execute() || $stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Bag not found or cannot be discarded.'], 404);
    $stmt->close();

    jR(['success' => true, 'message' => 'Bag discarded.']);
}