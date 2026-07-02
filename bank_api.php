<?php
/* ============================================================
   BloodBridge — bank_api.php (BANK DASHBOARD API)
   Fixes: bank dashboard was using admin-only API checks.
   Session roles accepted: blood_bank, blood-bank, bank, medical_college
   ============================================================ */

ob_start();
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

require_once __DIR__ . '/config.php';
ob_clean();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

/* session cookie managed by config.php */

function jR($data, $code = 200) {
    while (ob_get_level() > 0) {
        ob_clean();
        break;
    }

    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function reqBody() {
    $raw = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : $_POST;
}

function tableExists($table) {
    global $conn;
    $safe = $conn->real_escape_string($table);
    $res = $conn->query("SHOW TABLES LIKE '$safe'");
    return $res && $res->num_rows > 0;
}

function columnExists($table, $column) {
    global $conn;
    $safeTable = str_replace('`', '', $table);
    $safeCol = $conn->real_escape_string($column);
    $res = $conn->query("SHOW COLUMNS FROM `$safeTable` LIKE '$safeCol'");
    return $res && $res->num_rows > 0;
}

function fmtD($d) {
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('Y-m-d', strtotime($d));
}

function fmtDT($d) {
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('Y-m-d H:i:s', strtotime($d));
}

function dbOne($sql, $default = 0) {
    global $conn;

    $r = $conn->query($sql);
    if (!$r) return $default;

    $row = $r->fetch_assoc();
    if (!$row) return $default;

    $v = array_values($row)[0] ?? $default;
    return $v === null ? $default : $v;
}

function notifyUser($userId, $title, $message) {
    global $conn;

    if (!$userId || !tableExists('notification')) return;

    $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)");
    if (!$stmt) return;

    $stmt->bind_param('iss', $userId, $title, $message);
    $stmt->execute();
    $stmt->close();
}

function getBankIdFromSession() {
    global $conn;

    $roleRaw = strtolower(trim((string)($_SESSION['role'] ?? '')));
    $role = str_replace([' ', '-'], '_', $roleRaw);

    $bankRoles = ['blood_bank', 'bank', 'bloodbank', 'medical_college'];
    $hasBankRole = in_array($role, $bankRoles, true);

    $directBankId = $_SESSION['blood_bank_id'] ?? $_SESSION['bank_id'] ?? null;

    if ($directBankId !== null && is_numeric($directBankId)) {
        $bid = (int)$directBankId;

        $stmt = $conn->prepare("SELECT id FROM blood_bank WHERE id = ? AND status <> 'blocked' LIMIT 1");
        if ($stmt) {
            $stmt->bind_param('i', $bid);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if ($row) return $bid;
        }
    }

    $uid = $_SESSION['user_id'] ?? null;

    if ($uid !== null && is_numeric($uid)) {
        $uid = (int)$uid;

        if ($hasBankRole) {
            $stmt = $conn->prepare("SELECT id FROM blood_bank WHERE id = ? AND status <> 'blocked' LIMIT 1");
            if ($stmt) {
                $stmt->bind_param('i', $uid);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if ($row) return $uid;
            }
        }

        if (tableExists('users') && columnExists('users', 'blood_bank_id')) {
            $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
            if ($stmt) {
                $stmt->bind_param('i', $uid);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if ($row && !empty($row['blood_bank_id'])) {
                    return (int)$row['blood_bank_id'];
                }
            }
        }
    }

    return null;
}

function requireBank() {
    $bankId = getBankIdFromSession();

    if ($bankId) {
        return $bankId;
    }

    /* Build a helpful error showing exactly what session data was found */
    $sessionInfo = [
        'session_id'     => session_id() ?: 'none',
        'role'           => $_SESSION['role']           ?? 'NOT SET',
        'user_id'        => $_SESSION['user_id']        ?? 'NOT SET',
        'blood_bank_id'  => $_SESSION['blood_bank_id']  ?? 'NOT SET',
        'bank_id'        => $_SESSION['bank_id']        ?? 'NOT SET',
    ];

    jR([
        'success' => false,
        'error'   => 'AUTH_FAILED',
        'hint'    => 'Session does not contain a valid blood bank identity. Required: $_SESSION[blood_bank_id] or $_SESSION[user_id] with role blood_bank.',
        'session' => $sessionInfo
    ], 401);
}

/* ══════════════════════════════════════════════════════════
   PENDING REQUESTS — blood bank views requests waiting for acceptance
══════════════════════════════════════════════════════════ */
function handlePendingRequests() {
    global $conn;
    $bankId = requireBank();

    $status = trim($_GET['status'] ?? 'pending');
    $allowed = ['pending', 'approved', 'rejected', 'all'];
    if (!in_array($status, $allowed, true)) $status = 'pending';

    $where = "br.blood_bank_id = ?";
    $types = 'i';
    $params = [$bankId];

    if ($status !== 'all') {
        $where .= " AND br.status = ?";
        $types .= 's';
        $params[] = $status;
    }

    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency, br.status,
               br.requested_at, br.approved_at, br.notes, br.visible_to,
               br.blood_component, br.delivery_method,
               br.request_type, br.max_price_per_unit, br.payment_status,
               u.full_name AS requester_name, u.phone AS requester_phone,
               br.approved_by_user_id, br.approved_by_bank_id,
               au.full_name AS approved_by_user_name,
               ab.name AS approved_by_bank_name
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        LEFT JOIN users au ON au.id = br.approved_by_user_id
        LEFT JOIN blood_bank ab ON ab.id = br.approved_by_bank_id
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

    /* Tag each request with whether THIS bank has already offered */
    if (!empty($requests)) {
        $ids = implode(',', array_map(fn($r) => (int)$r['id'], $requests));
        $offerRows = $conn->query("
            SELECT entity_id, status AS offer_status
            FROM approval_step
            WHERE entity_type = 'blood_request'
              AND entity_id IN ($ids)
              AND approver_user_id = $bankId
        ");
        $offerMap = [];
        if ($offerRows) {
            while ($or = $offerRows->fetch_assoc()) {
                $offerMap[(int)$or['entity_id']] = $or['offer_status'];
            }
        }
        /* Also count total offers per request */
        $countRows = $conn->query("
            SELECT entity_id, COUNT(*) AS offer_count
            FROM approval_step
            WHERE entity_type = 'blood_request'
              AND entity_id IN ($ids)
              AND status IN ('pending','approved')
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
            $req['bank_offer_status'] = $offerMap[$rid] ?? null; // null=not offered, 'pending'=offered, 'approved'=selected
            $req['bank_offer_count']  = $countMap[$rid] ?? 0;
        }
        unset($req);
    }

    jR(['success' => true, 'requests' => $requests]);
}

/* ══════════════════════════════════════════════════════════
   ACCEPT REQUEST — blood bank explicitly approves a pending request
══════════════════════════════════════════════════════════ */
function handleAcceptRequest() {
    global $conn;
    $bankId = requireBank();
    $data   = reqBody();

    $requestId     = (int)($data['request_id']    ?? 0);
    $notes         = trim($data['notes']          ?? '');
    $pricePerUnit  = isset($data['price_per_unit']) && (float)$data['price_per_unit'] > 0
                     ? (float)$data['price_per_unit'] : null;

    if (!$requestId) jR(['success' => false, 'error' => 'request_id is required.'], 422);

    // Verify the request belongs to this bank and is still pending
    $stmt = $conn->prepare("
        SELECT id, blood_group, units_required, status, requester_user_id, visible_to,
               request_type, max_price_per_unit
        FROM blood_request
        WHERE id = ? AND blood_bank_id = ? AND status = 'pending'
        LIMIT 1
    ");
    $stmt->bind_param('ii', $requestId, $bankId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) {
        jR(['success' => false, 'error' => 'Request not found, not assigned to this bank, or already processed.'], 404);
    }

    // Donors must handle donor_recipient-only requests
    if ($req['visible_to'] === 'donor_recipient') {
        jR(['success' => false, 'error' => 'This request is for donors only and cannot be accepted by a blood bank.'], 403);
    }

    /* Validate price against request type */
    $reqType   = $req['request_type']       ?? 'free';
    $maxPrice  = (float)($req['max_price_per_unit'] ?? 0);
    if ($reqType === 'free' && $pricePerUnit > 0) {
        jR(['success' => false, 'error' => 'This request only accepts free blood supply. Remove your price to proceed.'], 422);
    }
    if (in_array($reqType, ['paid','open'], true) && $maxPrice > 0 && $pricePerUnit > $maxPrice) {
        jR(['success' => false, 'error' => "Your price (৳$pricePerUnit/unit) exceeds the requester's maximum (৳$maxPrice/unit)."], 422);
    }

    // Check blood bank has enough stock
    $stock = (int)dbOne("
        SELECT COUNT(*) AS c FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND blood_group = '" . $conn->real_escape_string($req['blood_group']) . "'
          AND status = 'available'
          AND expiry_date > CURDATE()
          AND culture_test_status <> 'failed'
    ", 0);

    if ($stock < (int)$req['units_required']) {
        jR([
            'success' => false,
            'error'   => "Insufficient stock. You have $stock unit(s) available but " . (int)$req['units_required'] . " required.",
        ], 422);
    }

    /* ── Check if this bank already offered for this request ── */
    $dupChk = $conn->query("
        SELECT id FROM approval_step
        WHERE entity_type = 'blood_request'
          AND entity_id   = $requestId
          AND approver_user_id = $bankId
          AND status IN ('pending','approved')
        LIMIT 1
    ");
    if ($dupChk && $dupChk->fetch_assoc()) {
        jR(['success' => false, 'error' => 'You have already offered blood for this request.'], 409);
    }

    /* ── Record the bank offer in approval_step (keep request pending) ── */
    $offerNote   = $notes ?: 'Blood bank has offered to fulfil this request.';
    $ppuVal      = $pricePerUnit !== null ? $pricePerUnit : 'NULL';
    $totalUnits  = (int)$req['units_required'];

    $insertOk = $conn->query("
        INSERT INTO approval_step
            (entity_id, entity_type, approver_user_id, step_order, status, comments, price_per_unit, total_units, created_at)
        VALUES
            ($requestId, 'blood_request', $bankId, 1, 'pending',
             '" . $conn->real_escape_string($offerNote) . "',
             $ppuVal, $totalUnits, NOW())
    ");
    if (!$insertOk) {
        jR(['success' => false, 'error' => 'Could not record offer: ' . $conn->error], 500);
    }

    /* ── Get bank name for notification ── */
    $bankNameRow = $conn->query("SELECT name FROM blood_bank WHERE id=$bankId LIMIT 1");
    $bankName = ($bankNameRow && ($bn = $bankNameRow->fetch_assoc())) ? $bn['name'] : 'A blood bank';
    $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);

    /* ── Notify the requester that a bank has offered ── */
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

/* ══════════════════════════════════════════════════════════
   REJECT REQUEST — blood bank rejects a pending request
══════════════════════════════════════════════════════════ */
function handleRejectRequest() {
    global $conn;
    $bankId = requireBank();
    $data   = reqBody();

    $requestId = (int)($data['request_id'] ?? 0);
    $reason    = trim($data['reason'] ?? '');

    if (!$requestId) jR(['success' => false, 'error' => 'request_id is required.'], 422);

    // Verify the request belongs to this bank and is still pending
    $stmt = $conn->prepare("
        SELECT id, requester_user_id, blood_group
        FROM blood_request
        WHERE id = ? AND blood_bank_id = ? AND status = 'pending'
        LIMIT 1
    ");
    $stmt->bind_param('ii', $requestId, $bankId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) {
        jR(['success' => false, 'error' => 'Request not found, not assigned to this bank, or already processed.'], 404);
    }

    $stmt = $conn->prepare("UPDATE blood_request SET status = 'rejected' WHERE id = ? AND blood_bank_id = ? AND status = 'pending'");
    $stmt->bind_param('ii', $requestId, $bankId);
    if (!$stmt->execute() || $stmt->affected_rows < 1) {
        jR(['success' => false, 'error' => 'Could not reject request.'], 500);
    }
    $stmt->close();

    // Notify the requester
    if (!empty($req['requester_user_id'])) {
        $msg = "Your blood request #REQ-" . str_pad($requestId, 4, '0', STR_PAD_LEFT) . " for " . $req['blood_group'] . " was not accepted by the blood bank.";
        if ($reason) $msg .= " Reason: $reason";
        notifyUser((int)$req['requester_user_id'], 'Blood Request Not Accepted', $msg);
    }

    jR(['success' => true, 'message' => 'Request rejected.', 'request_id' => $requestId]);
}

/* SESSION DEBUG — call bank_api.php?action=session_debug to inspect session */
function handleSessionDebug() {
    jR([
        'success'    => true,
        'session_id' => session_id() ?: 'none',
        'session'    => $_SESSION,
        'bank_id_resolved' => getBankIdFromSession()
    ]);
}

if (!isset($conn) || $conn->connect_error) {
    jR(['success' => false, 'error' => 'Database connection failed.'], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'session_debug':        handleSessionDebug(); break;
    case 'dashboard':            handleDashboard(); break;
    case 'inventory':            handleInventory(); break;
    case 'allocate_bag':         handleAllocateBag(); break;
    case 'expiry':               handleExpiry(); break;
    case 'coldchain':            handleColdChain(); break;
    case 'quarantine':           handleQuarantine(); break;
    case 'promises':             handlePromises(); break;
    case 'verify_promise':        handleVerifyPromise();       break;
    case 'update_promise_status': handleUpdatePromiseStatus(); break;
    case 'reschedule_promise':    handleReschedulePromise();   break;
    case 'ratings':              handleRatings(); break;
    case 'review_form_data':     handleReviewFormData(); break;
    case 'submit_review':        handleSubmitReview(); break;
    case 'leaderboard':          handleLeaderboard(); break;
    case 'drones':               handleDrones(); break;
    case 'dispatch_drone':       handleDispatchDrone(); break;
    case 'profile':              handleProfile(); break;
    case 'update_profile':       handleUpdateProfile(); break;
    case 'logout':               handleLogout();               break;
    case 'get_warnings':         handleGetWarningsBank();       break;
    case 'acknowledge_warning':  handleAcknowledgeWarningBank();break;
    case 'submit_improvement':   handleSubmitImprovementBank(); break;
    case 'appeal_warning':       handleAppealWarningBank();     break;
    case 'test_bags':
    case 'diagnose':             handleDebug(); break;
    case 'dashboard_stats':      handleDashboard(); break;
    case 'expiry_alerts':        handleExpiry(); break;
    case 'temperature_logs':     handleColdChain(); break;
    case 'quarantine_stats':     handleQuarantine(); break;
    case 'hospital_needs':       handleHospitalNeeds(); break;
    case 'pending_requests':     handlePendingRequests(); break;
    case 'accept_request':       handleAcceptRequest(); break;
    case 'reject_request':       handleRejectRequest(); break;
    case 'add_bag':              handleAddBag(); break;
    case 'edit_bag':             handleAllocateBag(); break;
    case 'delete_bag':           handleAllocateBag(); break;
    case 'allocate_expiry':      handleAllocateBag(); break;
    case 'clear_quarantine':     handleClearQuarantine(); break;
    case 'discard_quarantine':   handleDiscardQuarantine(); break;
    case 'drone_stats':          handleDroneStats(); break;
    case 'drone_deliveries':     handleDroneDeliveries(); break;
    case 'drone_weekly':         handleDroneWeekly(); break;
    case 'drone_maintenance':    handleDroneMaintenance(); break;
    case 'emergency_requests':   handleEmergencyRequestsList(); break;
    case 'emergency_approve':    handleEmergencyApproveBank(); break;
    case 'emergency_ignore':     handleEmergencyIgnoreBank(); break;
    case 'send_emergency_broadcast': handleSendEmergencyBroadcast(); break;
    case 'sent_broadcasts':          handleSentBroadcasts(); break;
    case 'change_password':          handleChangePasswordBank(); break;

    default:
        jR(['success' => false, 'error' => 'Unknown bank action: ' . htmlspecialchars($action)], 400);
}

/* ══════════════════════════════════════════════════════════
   EMERGENCY REQUESTS — list, approve, ignore (bank)
══════════════════════════════════════════════════════════ */
function handleEmergencyRequestsList() {
    global $conn;
    $bankId = requireBank();

    /* Get this bank's user_id to exclude self-created broadcasts */
    $selfRow = $conn->query("SELECT user_id FROM users WHERE blood_bank_id = $bankId LIMIT 1");
    $selfUserId = $selfRow ? (int)($selfRow->fetch_assoc()['user_id'] ?? 0) : 0;

    /* Get this bank's blood groups in stock — only show requests we can fulfill */
    $stockGroups = [];
    $stockRes = $conn->query("
        SELECT DISTINCT blood_group FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND expiry_date >= CURDATE()
    ");
    if ($stockRes) {
        while ($s = $stockRes->fetch_assoc()) {
            $stockGroups[] = $s['blood_group'];
        }
    }

    /* Exclude self-created requests */
    $excludeSelf = $selfUserId ? "AND er.requester_user_id != $selfUserId" : "";

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
          $excludeSelf
        ORDER BY er.created_at DESC
        LIMIT 50
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    /* Add can_fulfill flag based on blood group stock */
    foreach ($requests as &$req) {
        $req['can_fulfill'] = empty($stockGroups) ? false : in_array($req['blood_group'], $stockGroups);
    }
    unset($req);

    jR(['success' => true, 'requests' => $requests]);
}

function handleEmergencyApproveBank() {
    global $conn;
    $bankId = requireBank();
    $data   = reqBody();
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jR(['success' => false, 'error' => 'request_id required.'], 422);

    /* Get the emergency request details */
    $reqRow = $conn->query("
        SELECT er.id, er.extracted_blood_group AS blood_group, er.requester_user_id, er.status
        FROM emergency_request er
        WHERE er.id = $requestId AND er.status = 'pending'
        LIMIT 1
    ");
    if (!$reqRow || !($req = $reqRow->fetch_assoc()))
        jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);

    /* Prevent self-approval — check if this bank created the request */
    $selfRow = $conn->query("SELECT user_id FROM users WHERE blood_bank_id = $bankId LIMIT 1");
    $selfUserId = $selfRow ? (int)($selfRow->fetch_assoc()['user_id'] ?? 0) : 0;
    if ($selfUserId && $selfUserId === (int)$req['requester_user_id'])
        jR(['success' => false, 'error' => 'You cannot approve your own emergency broadcast.'], 403);

    /* Check if this bank has the required blood group in stock */
    $bloodGroup = $conn->real_escape_string($req['blood_group']);
    $stockCheck = $conn->query("
        SELECT COUNT(*) AS cnt FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND blood_group = '$bloodGroup'
          AND status = 'available'
          AND expiry_date >= CURDATE()
    ");
    $stock = $stockCheck ? (int)$stockCheck->fetch_assoc()['cnt'] : 0;
    if ($stock < 1)
        jR(['success' => false, 'error' => "You don't have $bloodGroup blood in stock. Cannot fulfill this request."], 422);

    /* Approve */
    $stmt = $conn->prepare("UPDATE emergency_request SET status = 'assigned', assigned_to_user_id = ?, processed_at = NOW() WHERE id = ? AND status = 'pending'");
    $stmt->bind_param('ii', $bankId, $requestId);
    $stmt->execute();
    if ($stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);
    $stmt->close();

    /* Notify the requester */
    if ($req['requester_user_id']) {
        $rid = (int)$req['requester_user_id'];
        $bankInfo = $conn->query("SELECT name, phone FROM blood_bank WHERE id = $bankId LIMIT 1");
        $bk = $bankInfo ? $bankInfo->fetch_assoc() : [];
        $bkName = $conn->real_escape_string($bk['name'] ?? 'A blood bank');
        $bkPhone = $conn->real_escape_string($bk['phone'] ?? '');
        $conn->query("INSERT INTO notification (user_id, title, message)
            VALUES ($rid, '✅ Emergency Request Fulfilled',
            '$bkName has confirmed they can provide $bloodGroup blood for your emergency request. Contact: $bkPhone')");
    }

    jR(['success' => true, 'message' => 'Emergency request approved. Requester has been notified.', 'blood_group' => $bloodGroup, 'stock' => $stock]);
}

function handleEmergencyIgnoreBank() {
    global $conn;
    requireBank();
    $data   = reqBody();
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jR(['success' => false, 'error' => 'request_id required.'], 422);

    $stmt = $conn->prepare("UPDATE emergency_request SET status = 'dismissed' WHERE id = ? AND status = 'pending'");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    if ($stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);
    $stmt->close();
    jR(['success' => true, 'message' => 'Emergency request dismissed.']);
}

/* SEND EMERGENCY BROADCAST — bank creates an emergency request visible to all entities */
function handleSendEmergencyBroadcast() {
    global $conn;
    $bankId = requireBank();
    $data = reqBody();

    $bloodGroup = trim($data['blood_group'] ?? '');
    $units = (int)($data['units'] ?? 1);
    $notes = trim($data['notes'] ?? '');
    $targets = $data['targets'] ?? [];

    if (!preg_match('/^(A|B|AB|O)[+-]$/', $bloodGroup))
        jR(['success' => false, 'error' => 'Valid blood group required (e.g. A+).'], 422);
    if ($units < 1 || $units > 50) $units = 1;

    if (empty($targets))
        jR(['success' => false, 'error' => 'Select at least one target (Blood Banks, Hospitals, etc.).'], 422);

    $bank = getBank($bankId);
    $bankName = $bank['name'] ?? 'Blood Bank #' . $bankId;
    $bankPhone = $bank['phone'] ?? '';

    /* Insert emergency request with bank as requester */
    $stmt = $conn->prepare("
        INSERT INTO emergency_request
            (requester_user_id, extracted_name, extracted_blood_group,
             extracted_location, requester_phone, required_units,
             status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->bind_param('issssi', $bankId, $bankName, $bloodGroup, $notes, $bankPhone, $units);
    $stmt->execute();
    $emergencyId = $stmt->insert_id;
    $stmt->close();

    $notifiedCount = 0;
    $institutionCount = 0;

    /* Notify donor_recipients with matching blood group */
    if (in_array('donor_recipient', $targets, true)) {
        $bg = $conn->real_escape_string($bloodGroup);
        $safeBankName = $conn->real_escape_string($bankName);
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
                    '🚨 $safeBankName needs $bg blood urgently. Please respond if you can donate.')");
                $notifiedCount++;
            }
        }
    }

    /* Collect institution IDs */
    $institutionIds = [];

    if (in_array('blood_bank', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $bankId AND role = 'blood_bank' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    if (in_array('hospital', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $bankId AND role = 'hospital' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    if (in_array('medical_college', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $bankId AND role = 'medical_college' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    $institutionIds = array_unique($institutionIds);
    $institutionCount = count($institutionIds);

    /* Update matched_donor_count */
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

/* SENT BROADCASTS — list emergency requests created by this bank */
function handleSentBroadcasts() {
    global $conn;
    $bankId = requireBank();

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
    $stmt->bind_param('i', $bankId);
    $stmt->execute();
    $broadcasts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'broadcasts' => $broadcasts]);
}

function getBank($bankId) {
    global $conn;

    $stmt = $conn->prepare("SELECT * FROM blood_bank WHERE id = ? LIMIT 1");
    if (!$stmt) return null;

    $stmt->bind_param('i', $bankId);
    $stmt->execute();
    $bank = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $bank;
}

function badgeFromRating($rating) {
    $rating = (float)$rating;

    if ($rating >= 4.5) return 'Gold';
    if ($rating >= 3.5) return 'Silver';
    if ($rating >= 2.5) return 'Bronze';

    return 'Standard';
}

/* DASHBOARD */
function handleDashboard() {
    global $conn;

    $bankId = requireBank();
    $bank = getBank($bankId);

    if (!$bank) {
        jR(['success' => false, 'error' => 'Blood bank not found.'], 404);
    }

    $units = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND expiry_date >= CURDATE()
    ", 0);

    $expiryAlerts = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          AND DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) <= 7
    ", 0);

    $critExpiry = $expiryAlerts;
    $ratingAvg = (float)($bank['rating_avg'] ?? 0);
    $badge = badgeFromRating($ratingAvg);

    $inventory = [];
    $res = $conn->query("
        SELECT 
            blood_group,
            COUNT(*) AS total,
            SUM(CASE WHEN expiry_date >= CURDATE()
                      AND DATEDIFF(expiry_date, CURDATE()) <= 7
                     THEN 1 ELSE 0 END) AS expiring7
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
        GROUP BY blood_group
    ");

    if ($res) {
        $inventory = $res->fetch_all(MYSQLI_ASSOC);
    }

    $expiringSoon = [];
    $res = $conn->query("
        SELECT
            id,
            bag_barcode,
            blood_group,
            storage_location,
            volume_ml,
            collection_date,
            expiry_date,
            LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY))          AS effective_expiry,
            DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) AS days_left
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          AND DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) <= 7
        ORDER BY effective_expiry ASC
        LIMIT 8
    ");

    if ($res) {
        $expiringSoon = $res->fetch_all(MYSQLI_ASSOC);
    }

    $critTemp = null;
    $stmt = $conn->prepare("
        SELECT *
        FROM temperature_log
        WHERE blood_bank_id = ?
          AND is_alert = 1
        ORDER BY recorded_at DESC
        LIMIT 1
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $critTemp = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    $reviews = [];
    $stmt = $conn->prepare("
        SELECT 
            br.*,
            COALESCE(u.full_name, 'Anonymous') AS reviewer_name
        FROM bank_review br
        LEFT JOIN users u ON u.id = br.reviewer_user_id
        WHERE br.blood_bank_id = ?
        ORDER BY br.created_at DESC
        LIMIT 5
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    $drones = [];
    $stmt = $conn->prepare("
        SELECT 
            d.*,
            dd.status AS dispatch_status,
            dd.estimated_arrival
        FROM drone d
        LEFT JOIN drone_dispatch dd ON dd.id = (
            SELECT dd2.id
            FROM drone_dispatch dd2
            WHERE dd2.drone_id = d.id
              AND dd2.status IN ('scheduled','en_route','in_flight')
            ORDER BY dd2.created_at DESC
            LIMIT 1
        )
        WHERE d.blood_bank_id = ?
        ORDER BY d.id DESC
        LIMIT 5
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $drones = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    $adminWarnings = [];

    if (tableExists('admin_warning')) {
        /* Fetch ALL warnings for this bank */
        $dimSql = columnExists('admin_warning','is_dismissed') 
            ? "AND (is_dismissed=0 OR is_dismissed IS NULL)" : "";
        $planCol = columnExists('admin_warning','admin_improvement_plan') ? ', admin_improvement_plan' : '';
        $warnSql = "SELECT id, message, status, sent_at, response, responded_at{$planCol}
            FROM admin_warning
            WHERE target_type='blood_bank' AND target_id=? AND status NOT IN ('blocked','cool_down') $dimSql
            ORDER BY sent_at DESC";
        $stmt = $conn->prepare($warnSql);

        if ($stmt) {
            $stmt->bind_param('i', $bankId);
            $stmt->execute();
            $adminWarnings = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }
    }

    jR([
        'success' => true,
        'bank' => [
            'id' => (int)$bank['id'],
            'name' => $bank['name'],
            'registration_no' => $bank['registration_no'],
            'email' => $bank['email'],
            'phone' => $bank['phone'],
            'city' => $bank['city'],
            'state' => $bank['state'],
            'country' => $bank['country'],
            'rating_avg' => $ratingAvg,
            'status' => $bank['status'],
            'badge_status' => $badge,
            'created_at' => $bank['created_at']
        ],
        'stats' => [
            'units_in_stock' => $units,
            'rating_avg' => $ratingAvg,
            'expiry_alerts' => $expiryAlerts,
            'crit_expiry' => $critExpiry,
            'badge_status' => $badge
        ],
        'inventory' => $inventory,
        'expiring_soon' => $expiringSoon,
        'crit_temp' => $critTemp,
        'reviews' => $reviews,
        'drones' => $drones,
        'admin_warnings' => $adminWarnings,
        'warning_count'  => count($adminWarnings)
    ]);
}

/* INVENTORY */
function handleInventory() {
    global $conn;

    $bankId = requireBank();

    $type = trim($_GET['type'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = 20;
    $offset = ($page - 1) * $limit;

    $where = ["bg.blood_bank_id = ?"];
    $types = 'i';
    $params = [$bankId];

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
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $whereSql = implode(' AND ', $where);

    $byGroup = [];
    $stmt = $conn->prepare("
        SELECT 
            blood_group,
            COUNT(*) AS total,
            SUM(CASE WHEN expiry_date >= CURDATE()
                      AND DATEDIFF(expiry_date, CURDATE()) <= 7
                     THEN 1 ELSE 0 END) AS expiring7
        FROM blood_bag
        WHERE blood_bank_id = ?
          AND status = 'available'
        GROUP BY blood_group
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $byGroup = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    $totals = [
        'total' => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId", 0),
        'expiring7' => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND expiry_date >= CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= 7", 0),
        'quarantined' => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND status = 'quarantined'", 0),
        'available' => (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND status = 'available'", 0)
    ];

    $countSql = "
        SELECT COUNT(*) AS c
        FROM blood_bag bg
        LEFT JOIN donation dn ON dn.id = bg.donation_id
        LEFT JOIN users u ON u.id = dn.donor_user_id
        WHERE $whereSql
    ";

    $stmt = $conn->prepare($countSql);

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Inventory count failed: ' . $conn->error], 500);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $totalRows = (int)($stmt->get_result()->fetch_assoc()['c'] ?? 0);
    $stmt->close();

    $sql = "
        SELECT 
            bg.*,
            DATEDIFF(bg.expiry_date, CURDATE()) AS days_to_expiry,
            COALESCE(u.full_name, '—') AS donor_name
        FROM blood_bag bg
        LEFT JOIN donation dn ON dn.id = bg.donation_id
        LEFT JOIN users u ON u.id = dn.donor_user_id
        WHERE $whereSql
        ORDER BY bg.expiry_date ASC, bg.id DESC
        LIMIT ? OFFSET ?
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Inventory query failed: ' . $conn->error], 500);
    }

    $types2 = $types . 'ii';
    $params2 = array_merge($params, [$limit, $offset]);

    $stmt->bind_param($types2, ...$params2);
    $stmt->execute();
    $bags = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR([
        'success' => true,
        'by_group' => $byGroup,
        'totals' => $totals,
        'bags' => $bags,
        'total_rows' => $totalRows,
        'limit' => $limit,
        'page' => $page
    ]);
}

/* ADD BAG */
function handleAddBag() {
    global $conn;
    $bankId = requireBank();
    $data = reqBody();

    $barcode    = trim($data['bag_barcode']      ?? $data['bagId']    ?? '');
    $bloodGroup = trim($data['blood_group']      ?? $data['type']     ?? '');
    $donorName  = trim($data['donor_name']       ?? $data['donorId']  ?? '');
    $expiry     = trim($data['expiry_date']      ?? $data['expiry']   ?? '');
    $storage    = trim($data['storage_location'] ?? $data['storage']  ?? '');
    $volume     = (int)($data['volume_ml'] ?? 450);
    $collDate   = trim($data['collection_date']  ?? '');

    if (!$barcode)    jR(['success' => false, 'error' => 'Bag barcode is required.'],  422);
    if (!$bloodGroup) jR(['success' => false, 'error' => 'Blood group is required.'],  422);

    /* ── Auto-calculate expiry from 42-day shelf life ──
       Blood bags have a standard shelf life of 42 days from collection.
       If no expiry provided → auto-set to collection_date + 42 days.
       If collection_date not provided → use today as collection date.
    ── */
    $collDateFinal = $collDate ?: date('Y-m-d');
    if (!$expiry) {
        $expiry = date('Y-m-d', strtotime($collDateFinal . ' +42 days'));
    }
    /* Warn if expiry is more than 42 days from collection (data entry error) */
    $maxExpiry = date('Y-m-d', strtotime($collDateFinal . ' +42 days'));
    if ($expiry > $maxExpiry) {
        $expiry = $maxExpiry; /* cap at 42 days */
    }

    // Look up donor by name if provided (to store donation_id reference)
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
        $stmt->bind_param('si', $likeName, $bankId);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $donationId = $result ? (int)$result['id'] : null;
        $stmt->close();
    }

    $stmt = $conn->prepare("
        INSERT INTO blood_bag
            (blood_bank_id, bag_barcode, blood_group, donation_id,
             volume_ml, collection_date, expiry_date, status,
             storage_location, culture_test_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?, 'pending')
    ");
    $stmt->bind_param('ississs', $bankId, $barcode, $bloodGroup, $donationId,
                      $volume, $collDateFinal, $expiry, $storage);
    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Failed to add bag: ' . $stmt->error], 500);
    }
    $bagId = $conn->insert_id;
    $stmt->close();

    jR(['success' => true, 'message' => "Bag #$barcode added successfully.", 'bag_id' => $bagId]);
}

/* ALLOCATE BAG */
function handleAllocateBag() {
    global $conn;

    $bankId = requireBank();
    $data = reqBody();

    $bagId = (int)($data['bag_id'] ?? 0);

    if (!$bagId) {
        jR(['success' => false, 'error' => 'bag_id is required.'], 422);
    }

    $stmt = $conn->prepare("
        UPDATE blood_bag
        SET status = 'reserved'
        WHERE id = ?
          AND blood_bank_id = ?
          AND status = 'available'
    ");

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Prepare failed: ' . $conn->error], 500);
    }

    $stmt->bind_param('ii', $bagId, $bankId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected < 1) {
        jR(['success' => false, 'error' => 'Bag not found or not available.'], 404);
    }

    jR(['success' => true, 'message' => 'Bag marked as reserved.']);
}

/* EXPIRY */
function handleExpiry() {
    global $conn;

    $bankId = requireBank();
    $urgency = $_GET['urgency'] ?? 'all';

    /* Use the LESSER of (expiry_date) and (collection_date + 42 days) as effective expiry
       so bags with manually-set wrong future dates are still caught */
    $critical = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          AND DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) <= 2
    ", 0);

    $warning = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          AND DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) BETWEEN 3 AND 5
    ", 0);

    $notice = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          AND DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) BETWEEN 6 AND 7
    ", 0);

    $allocatedToday = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'reserved'
          AND DATE(created_at) = CURDATE()
    ", 0);

    $range = "AND DATEDIFF(expiry_date, CURDATE()) <= 7";

    if ($urgency === 'critical') {
        $range = "AND DATEDIFF(expiry_date, CURDATE()) <= 2";
    }

    if ($urgency === 'warning') {
        $range = "AND DATEDIFF(expiry_date, CURDATE()) BETWEEN 3 AND 5";
    }

    if ($urgency === 'notice') {
        $range = "AND DATEDIFF(expiry_date, CURDATE()) BETWEEN 6 AND 7";
    }

    /* Use effective_expiry = LEAST(expiry_date, collection_date+42) */
    $range = str_replace('expiry_date', 'LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY))', $range);

    $res = $conn->query("
        SELECT
            id,
            bag_barcode,
            blood_group,
            volume_ml,
            storage_location,
            collection_date,
            expiry_date,
            DATE_ADD(collection_date, INTERVAL 42 DAY)                              AS shelf_expiry,
            LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY))          AS effective_expiry,
            DATEDIFF(LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)), CURDATE()) AS days_left
        FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND status = 'available'
          AND LEAST(expiry_date, DATE_ADD(collection_date, INTERVAL 42 DAY)) >= CURDATE()
          $range
        ORDER BY effective_expiry ASC
    ");

    $bags = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR([
        'success' => true,
        'critical' => $critical,
        'warning' => $warning,
        'notice' => $notice,
        'allocated_today' => $allocatedToday,
        'bags' => $bags
    ]);
}

/* COLD CHAIN */
function handleColdChain() {
    global $conn;

    $bankId = requireBank();
    $sensor = trim($_GET['sensor'] ?? '');

    $sensorWhere = $sensor !== ''
        ? " AND sensor_id = '" . $conn->real_escape_string($sensor) . "'"
        : '';

    $normal = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM temperature_log
        WHERE blood_bank_id = $bankId
          AND temperature_celsius BETWEEN 2 AND 6
          $sensorWhere
    ", 0);

    $warning = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM temperature_log
        WHERE blood_bank_id = $bankId
          AND temperature_celsius > 6
          AND temperature_celsius <= 8
          $sensorWhere
    ", 0);

    $critical = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM temperature_log
        WHERE blood_bank_id = $bankId
          AND (temperature_celsius < 2 OR temperature_celsius > 8)
          $sensorWhere
    ", 0);

    $sensorList = [];
    $res = $conn->query("
        SELECT DISTINCT sensor_id
        FROM temperature_log
        WHERE blood_bank_id = $bankId
        ORDER BY sensor_id ASC
    ");

    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $sensorList[] = $row['sensor_id'];
        }
    }

    $sensors = [];
    $res = $conn->query("
        SELECT 
            tl.sensor_id,
            ROUND(AVG(tl.temperature_celsius), 1) AS avg_temp,
            MAX(tl.recorded_at) AS last_reading,
            COALESCE(su.min_temp, 2.00) AS min_temp,
            COALESCE(su.max_temp, 6.00) AS max_temp
        FROM temperature_log tl
        LEFT JOIN storage_unit su
               ON su.blood_bank_id = tl.blood_bank_id
              AND su.sensor_id = tl.sensor_id
        WHERE tl.blood_bank_id = $bankId
          $sensorWhere
        GROUP BY tl.sensor_id, su.min_temp, su.max_temp
        ORDER BY last_reading DESC
    ");

    if ($res) {
        $sensors = $res->fetch_all(MYSQLI_ASSOC);
    }

    $logs = [];
    $res = $conn->query("
        SELECT id, sensor_id, temperature_celsius, recorded_at, is_alert
        FROM temperature_log
        WHERE blood_bank_id = $bankId
          $sensorWhere
        ORDER BY recorded_at DESC
        LIMIT 100
    ");

    if ($res) {
        $logs = $res->fetch_all(MYSQLI_ASSOC);
    }

    jR([
        'success' => true,
        'normal' => $normal,
        'warning' => $warning,
        'critical' => $critical,
        'sensor_list' => $sensorList,
        'sensors' => $sensors,
        'logs' => $logs
    ]);
}

/* QUARANTINE */
function handleQuarantine() {
    global $conn;

    $bankId = requireBank();

    $risk = $_GET['risk'] ?? 'all';
    $search = trim($_GET['search'] ?? '');

    $active = (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND status = 'quarantined'", 0);
    $pending = (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND culture_test_status = 'pending'", 0);
    $cleared = (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND culture_test_status IN ('passed','cleared') AND MONTH(created_at)=MONTH(CURDATE()) AND YEAR(created_at)=YEAR(CURDATE())", 0);
    $disposed = (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId AND status IN ('discarded','disposed')", 0);

    $where = ["bg.blood_bank_id = ?"];
    $types = 'i';
    $params = [$bankId];

    if ($risk === 'high') {
        $where[] = "bct.pathogen_detected IS NOT NULL AND bct.pathogen_detected <> ''";
    }

    if ($risk === 'medium') {
        $where[] = "bg.status = 'quarantined' AND (bct.pathogen_detected IS NULL OR bct.pathogen_detected = '')";
    }

    if ($risk === 'cleared') {
        $where[] = "bg.culture_test_status IN ('passed','cleared')";
    }

    if ($search !== '') {
        $where[] = "(bg.bag_barcode LIKE ? OR bg.blood_group LIKE ? OR bct.result LIKE ?)";
        $like = '%' . $search . '%';
        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql = "
        SELECT 
            bg.id,
            bg.bag_barcode,
            bg.blood_group,
            bg.status,
            bg.created_at,
            bg.culture_test_status,
            bct.result,
            bct.pathogen_detected,
            COALESCE(u.full_name, '—') AS technician_name
        FROM blood_bag bg
        LEFT JOIN blood_culture_test bct ON bct.id = (
            SELECT bct2.id
            FROM blood_culture_test bct2
            WHERE bct2.blood_bag_id = bg.id
            ORDER BY bct2.test_date DESC
            LIMIT 1
        )
        LEFT JOIN users u ON u.id = bct.lab_technician_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY bg.created_at DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Quarantine query failed: ' . $conn->error], 500);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $bags = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR([
        'success' => true,
        'active' => $active,
        'pending' => $pending,
        'cleared' => $cleared,
        'disposed' => $disposed,
        'bags' => $bags
    ]);
}

/* PROMISES */
function handlePromises() {
    global $conn;

    $bankId = requireBank();
    $status = trim($_GET['status'] ?? '');

    $where = "dp.blood_bank_id = ?";
    $types = 'i';
    $params = [$bankId];

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

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Promises query failed: ' . $conn->error], 500);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $promises = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'promises' => $promises]);
}

function handleVerifyPromise() {
    global $conn;

    $bankId = requireBank();
    $data = reqBody();

    $code = trim($data['confirmation_code'] ?? '');

    if ($code === '') {
        jR(['success' => false, 'error' => 'Confirmation code is required.'], 422);
    }

    $stmt = $conn->prepare("
        SELECT 
            dp.*,
            u.full_name AS donor_name,
            dr.blood_group
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE dp.blood_bank_id = ?
          AND dp.confirmation_code = ?
        LIMIT 1
    ");

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Verify query failed: ' . $conn->error], 500);
    }

    $stmt->bind_param('is', $bankId, $code);
    $stmt->execute();
    $promise = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$promise) {
        jR(['success' => false, 'error' => 'Promise code not found for this blood bank.'], 404);
    }

    jR(['success' => true, 'promise' => $promise]);
}


/* ══════════════════════════════════════════════
   PROMISE ACTIONS — blood bank updates promise status
══════════════════════════════════════════════ */

/* Mark promise as fulfilled or broken */
function handleUpdatePromiseStatus() {
    global $conn;
    $bankId = requireBank();
    $data   = reqBody();

    $promiseId = (int)($data['promise_id'] ?? 0);
    $status    = trim($data['status'] ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!in_array($status, ['fulfilled','broken'], true)) {
        jR(['success'=>false,'error'=>'Status must be fulfilled or broken.'],422);
    }

    /* Verify promise belongs to this bank */
    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $bankId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jR(['success'=>false,'error'=>'Promise not found.'],404);
    $chk->close();

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

    /* If broken — reduce donor trust score by 10 */
    if ($status === 'broken') {
        $conn->query("
            UPDATE donor_recipient dr
            JOIN donation_promise dp ON dp.donor_user_id = dr.user_id
            SET dr.trust_score = GREATEST(0, dr.trust_score - 10)
            WHERE dp.id = $promiseId
        ");
    }

    /* If fulfilled — increase donor trust score by 5 AND create donation record */
    if ($status === 'fulfilled') {
        $conn->query("
            UPDATE donor_recipient dr
            JOIN donation_promise dp ON dp.donor_user_id = dr.user_id
            SET dr.trust_score = LEAST(100, dr.trust_score + 5)
            WHERE dp.id = $promiseId
        ");

        /* Insert into donation table so it appears in donor's history */
        $dp = $conn->query("SELECT donor_user_id, blood_bank_id FROM donation_promise WHERE id=$promiseId LIMIT 1");
        if ($dp) {
            $dpRow = $dp->fetch_assoc();
            if ($dpRow) {
                $donorId = (int)$dpRow['donor_user_id'];
                $bbId    = (int)$dpRow['blood_bank_id'];
                $ins = $conn->prepare("
                    INSERT INTO donation
                        (donor_user_id, blood_bank_id, donation_promise_id, donation_date, status, created_at)
                    VALUES
                        (?, ?, ?, NOW(), 'completed', NOW())
                ");
                if ($ins) {
                    $ins->bind_param('iii', $donorId, $bbId, $promiseId);
                    $ins->execute();
                    $donationId = $ins->insert_id; /* capture BEFORE close() */
                    $ins->close();

                    /* Update donor_recipient.total_donations (count fulfilled promises from ALL flows) */
                    $conn->query("
                        UPDATE donor_recipient
                        SET total_donations = (
                            SELECT COUNT(*) FROM donation_promise
                            WHERE donor_user_id = $donorId AND status = 'fulfilled'
                        ),
                        last_donation_date = NOW()
                        WHERE user_id = $donorId
                    ");

                    /* Create blood_bag so inventory updates */
                    $barcode       = 'BB-' . strtoupper(substr(md5(uniqid((string)$donorId, true)), 0, 8));
                    $expiryDate    = date('Y-m-d', strtotime('+42 days'));
                    $bgRes         = $conn->query("SELECT blood_group FROM donor_recipient WHERE user_id=$donorId LIMIT 1");
                    $bloodGroup    = ($bgRes && ($bgRow = $bgRes->fetch_assoc())) ? ($bgRow['blood_group'] ?? 'O+') : 'O+';

                    $bagStmt = $conn->prepare("
                        INSERT INTO blood_bag
                            (blood_bank_id, bag_barcode, blood_group, donation_id,
                             volume_ml, collection_date, expiry_date, status,
                             storage_location, culture_test_status, created_at)
                        VALUES
                            (?, ?, ?, ?, 450, NOW(), ?, 'available', 'Freezer A1', 'pending', NOW())
                    ");
                    if ($bagStmt) {
                        $bagStmt->bind_param('issis', $bbId, $barcode, $bloodGroup, $donationId, $expiryDate);
                        $bagStmt->execute();
                        $bagStmt->close();
                    }
                }
            }
        }
    }

    jR(['success'=>true,'message'=>'Promise status updated to ' . $status . '.']);
}

/* Reschedule — update promise_time */
function handleReschedulePromise() {
    global $conn;
    $bankId = requireBank();
    $data   = reqBody();

    $promiseId  = (int)($data['promise_id']  ?? 0);
    $newDate    = trim($data['new_date']      ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!$newDate)   jR(['success'=>false,'error'=>'new_date required.'],422);

    /* Validate date format */
    $ts = strtotime($newDate);
    if (!$ts) jR(['success'=>false,'error'=>'Invalid date format.'],422);
    $formatted = date('Y-m-d H:i:s', $ts);

    /* Verify ownership */
    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $bankId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jR(['success'=>false,'error'=>'Promise not found.'],404);
    $chk->close();

    $stmt = $conn->prepare("UPDATE donation_promise SET promise_time=?, status='pending' WHERE id=?");
    $stmt->bind_param('si', $formatted, $promiseId);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>$stmt->error],500);
    $stmt->close();

    jR(['success'=>true,'message'=>'Promise rescheduled successfully.']);
}

/* RATINGS */
function handleRatings() {
    global $conn;

    $bankId = requireBank();

    $search = trim($_GET['search'] ?? '');
    $rating = (int)($_GET['rating'] ?? 0);

    $summary = [
        'avg' => 0,
        'total' => 0,
        'r5' => 0,
        'r4' => 0,
        'r3' => 0,
        'r2' => 0,
        'r1' => 0
    ];

    $stmt = $conn->prepare("
        SELECT 
            AVG(rating) AS avg_rating,
            COUNT(*) AS total,
            SUM(rating=5) AS r5,
            SUM(rating=4) AS r4,
            SUM(rating=3) AS r3,
            SUM(rating=2) AS r2,
            SUM(rating=1) AS r1
        FROM bank_review
        WHERE blood_bank_id = ?
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $summary = [
            'avg' => (float)($row['avg_rating'] ?? 0),
            'total' => (int)($row['total'] ?? 0),
            'r5' => (int)($row['r5'] ?? 0),
            'r4' => (int)($row['r4'] ?? 0),
            'r3' => (int)($row['r3'] ?? 0),
            'r2' => (int)($row['r2'] ?? 0),
            'r1' => (int)($row['r1'] ?? 0)
        ];
    }

    $where = ["br.blood_bank_id = ?"];
    $types = 'i';
    $params = [$bankId];

    if ($rating >= 1 && $rating <= 5) {
        $where[] = "br.rating = ?";
        $types .= 'i';
        $params[] = $rating;
    }

    if ($search !== '') {
        $where[] = "(br.review_text LIKE ? OR u.full_name LIKE ?)";
        $like = '%' . $search . '%';
        $types .= 'ss';
        $params[] = $like;
        $params[] = $like;
    }

    $sql = "
        SELECT 
            br.*,
            COALESCE(u.full_name, 'Anonymous') AS reviewer_name,
            COALESCE(u.role, 'donor') AS reviewer_type
        FROM bank_review br
        LEFT JOIN users u ON u.id = br.reviewer_user_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY br.created_at DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Reviews query failed: ' . $conn->error], 500);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $thisMonth = (int)dbOne("
        SELECT COUNT(*) AS c
        FROM bank_review
        WHERE blood_bank_id = $bankId
          AND MONTH(created_at)=MONTH(CURDATE())
          AND YEAR(created_at)=YEAR(CURDATE())
    ", 0);

    jR([
        'success' => true,
        'summary' => $summary,
        'reviews' => $reviews,
        'this_month' => $thisMonth,
        'change' => null
    ]);
}

function handleReviewFormData() {
    global $conn;

    $bankId = requireBank();

    $donors = [];
    $stmt = $conn->prepare("
        SELECT DISTINCT
            dp.donor_user_id,
            u.full_name AS donor_name,
            dr.blood_group,
            dp.status
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE dp.blood_bank_id = ?
        ORDER BY u.full_name ASC
    ");

    if ($stmt) {
        $stmt->bind_param('i', $bankId);
        $stmt->execute();
        $donors = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    $entities = [];
    $res = $conn->query("
        SELECT id, name, 'blood_bank' AS entity_type
        FROM blood_bank
        WHERE id <> $bankId
          AND status = 'active'
        ORDER BY name ASC
    ");

    if ($res) {
        $entities = $res->fetch_all(MYSQLI_ASSOC);
    }

    jR([
        'success' => true,
        'promise_donors' => $donors,
        'entities' => $entities
    ]);
}

function handleSubmitReview() {
    global $conn;

    $bankId = requireBank();
    $data = reqBody();

    $donorId = (int)($data['donor_user_id'] ?? 0);
    $entityId = (int)($data['entity_id'] ?? 0);
    $entityType = $data['entity_type'] ?? 'blood_bank';
    $rating = max(1, min(5, (int)($data['rating'] ?? 5)));
    $reviewText = trim($data['review_text'] ?? '');

    if (!$donorId || !$entityId || $entityType !== 'blood_bank') {
        jR(['success' => false, 'error' => 'Valid donor and blood bank entity are required.'], 422);
    }

    $stmt = $conn->prepare("
        SELECT id
        FROM donation_promise
        WHERE blood_bank_id = ?
          AND donor_user_id = ?
        LIMIT 1
    ");

    $stmt->bind_param('ii', $bankId, $donorId);
    $stmt->execute();
    $ok = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$ok) {
        jR(['success' => false, 'error' => 'This donor is not eligible for review from this bank.'], 403);
    }

    $stmt = $conn->prepare("
        INSERT INTO bank_review
            (blood_bank_id, reviewer_user_id, rating, review_text)
        VALUES
            (?, ?, ?, ?)
    ");

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Review prepare failed: ' . $conn->error], 500);
    }

    $stmt->bind_param('iiis', $entityId, $donorId, $rating, $reviewText);

    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Review failed: ' . $stmt->error], 500);
    }

    $stmt->close();

    $avg = dbOne("SELECT AVG(rating) AS avg_rating FROM bank_review WHERE blood_bank_id = $entityId", 0);

    $stmt = $conn->prepare("UPDATE blood_bank SET rating_avg = ? WHERE id = ?");

    if ($stmt) {
        $avg = (float)$avg;
        $stmt->bind_param('di', $avg, $entityId);
        $stmt->execute();
        $stmt->close();
    }

    jR(['success' => true, 'message' => 'Review submitted successfully.']);
}

/* LEADERBOARD */
function handleLeaderboard() {
    global $conn;

    $bankId = requireBank();

    $period = $_GET['period'] ?? 'monthly';
    $search = trim($_GET['search'] ?? '');
    $bg = trim($_GET['blood_group'] ?? '');

    $periodWhere = $period === 'yearly'
        ? "YEAR(d.donation_date) = YEAR(CURDATE())"
        : "MONTH(d.donation_date) = MONTH(CURDATE()) AND YEAR(d.donation_date) = YEAR(CURDATE())";

    $where = ["d.blood_bank_id = ?"];
    $types = 'i';
    $params = [$bankId];

    if ($search !== '') {
        $where[] = "(u.full_name LIKE ? OR fl.family_name LIKE ?)";
        $like = '%' . $search . '%';
        $types .= 'ss';
        $params[] = $like;
        $params[] = $like;
    }

    if ($bg !== '') {
        $where[] = "dr.blood_group = ?";
        $types .= 's';
        $params[] = $bg;
    }

    $sql = "
        SELECT 
            u.id,
            u.full_name,
            dr.blood_group,
            COALESCE(fl.family_name, u.full_name) AS family_name,
            COALESCE(dr.total_donations, COUNT(d.id)) AS total_donations,
            SUM(CASE WHEN $periodWhere THEN 1 ELSE 0 END) AS donations_period,
            COALESCE(dr.trust_score, 0) AS trust_score
        FROM donation d
        LEFT JOIN users u ON u.id = d.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = u.id
        LEFT JOIN family_legacy fl ON fl.id = dr.family_legacy_id
        WHERE " . implode(' AND ', $where) . "
        GROUP BY u.id, u.full_name, dr.blood_group, fl.family_name, dr.total_donations, dr.trust_score
        ORDER BY trust_score DESC, total_donations DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Leaderboard query failed: ' . $conn->error], 500);
    }

    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $leaderboard = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    if (!$leaderboard) {
        $res = $conn->query("
            SELECT 
                fl.family_name,
                NULL AS full_name,
                NULL AS blood_group,
                fl.total_donations,
                fl.total_donations AS donations_period,
                0 AS trust_score
            FROM family_legacy fl
            WHERE fl.blood_bank_id = $bankId
            ORDER BY fl.total_donations DESC
            LIMIT 100
        ");

        $leaderboard = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    }

    jR(['success' => true, 'leaderboard' => $leaderboard]);
}

/* DRONES */
function handleDrones() {
    global $conn;

    $bankId = requireBank();

    $fleetStats = [
        'available' => (int)dbOne("SELECT COUNT(*) AS c FROM drone WHERE blood_bank_id = $bankId AND status = 'idle'", 0),
        'in_flight' => (int)dbOne("SELECT COUNT(*) AS c FROM drone WHERE blood_bank_id = $bankId AND status IN ('in_flight','en_route')", 0),
        'charging' => (int)dbOne("SELECT COUNT(*) AS c FROM drone WHERE blood_bank_id = $bankId AND status = 'charging'", 0),
        'maintenance' => (int)dbOne("SELECT COUNT(*) AS c FROM drone WHERE blood_bank_id = $bankId AND status = 'maintenance'", 0),
        'deliveries_today' => (int)dbOne("SELECT COUNT(*) AS c FROM drone_dispatch WHERE source_bank_id = $bankId AND DATE(created_at) = CURDATE()", 0)
    ];

    $res = $conn->query("
        SELECT *
        FROM drone
        WHERE blood_bank_id = $bankId
        ORDER BY id DESC
    ");

    $fleet = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT 
            dd.*,
            d.drone_code,
            br.blood_group,
            br.units_required
        FROM drone_dispatch dd
        LEFT JOIN drone d ON d.id = dd.drone_id
        LEFT JOIN blood_request br ON br.id = dd.blood_request_id
        WHERE dd.source_bank_id = $bankId
          AND dd.status IN ('scheduled','en_route','in_flight')
        ORDER BY dd.created_at DESC
    ");

    $dispatches = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR([
        'success' => true,
        'fleet_stats' => $fleetStats,
        'fleet' => $fleet,
        'dispatches' => $dispatches
    ]);
}

function handleDispatchDrone() {
    global $conn;

    $bankId = requireBank();
    $data = reqBody();

    $droneId = (int)($data['drone_id'] ?? 0);
    $requestId = (int)($data['blood_request_id'] ?? 0);

    if (!$droneId || !$requestId) {
        jR(['success' => false, 'error' => 'drone_id and blood_request_id are required.'], 422);
    }

    $stmt = $conn->prepare("
        SELECT id
        FROM drone
        WHERE id = ?
          AND blood_bank_id = ?
          AND status = 'idle'
        LIMIT 1
    ");

    $stmt->bind_param('ii', $droneId, $bankId);
    $stmt->execute();
    $drone = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$drone) {
        jR(['success' => false, 'error' => 'Drone is not available.'], 422);
    }

    $stmt = $conn->prepare("
        SELECT id
        FROM blood_request
        WHERE id = ?
          AND blood_bank_id = ?
        LIMIT 1
    ");

    $stmt->bind_param('ii', $requestId, $bankId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) {
        jR(['success' => false, 'error' => 'Blood request not found for this bank.'], 404);
    }

    $conn->begin_transaction();

    try {
        $eta = date('Y-m-d H:i:s', time() + 45 * 60);
        $status = 'en_route';

        $stmt = $conn->prepare("
            INSERT INTO drone_dispatch
                (drone_id, blood_request_id, source_bank_id, estimated_arrival, status)
            VALUES
                (?, ?, ?, ?, ?)
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param('iiiss', $droneId, $requestId, $bankId, $eta, $status);
        $stmt->execute();
        $stmt->close();

        $newDroneStatus = 'in_flight';

        $stmt = $conn->prepare("
            UPDATE drone
            SET status = ?
            WHERE id = ?
              AND blood_bank_id = ?
        ");

        if (!$stmt) {
            throw new Exception($conn->error);
        }

        $stmt->bind_param('sii', $newDroneStatus, $droneId, $bankId);
        $stmt->execute();
        $stmt->close();

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        jR(['success' => false, 'error' => 'Dispatch failed: ' . $e->getMessage()], 500);
    }

    jR(['success' => true, 'message' => '✅ Drone dispatched successfully.']);
}

/* PROFILE */
function handleProfile() {
    global $conn;

    $bankId = requireBank();
    $p = getBank($bankId);

    if (!$p) {
        jR(['success' => false, 'error' => 'Profile not found.'], 404);
    }

    $totalBags = (int)dbOne("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bankId", 0);
    $activeDrones = (int)dbOne("SELECT COUNT(*) AS c FROM drone WHERE blood_bank_id = $bankId AND status <> 'maintenance'", 0);
    $totalPromises = (int)dbOne("SELECT COUNT(*) AS c FROM donation_promise WHERE blood_bank_id = $bankId", 0);

    jR([
        'success' => true,
        'profile' => $p,
        'total_bags' => $totalBags,
        'active_drones' => $activeDrones,
        'total_promises' => $totalPromises
    ]);
}

function handleUpdateProfile() {
    global $conn;

    $bankId = requireBank();
    $data = reqBody();

    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address_line'] ?? '');
    $city = trim($data['city'] ?? '');
    $state = trim($data['state'] ?? '');
    $country = trim($data['country'] ?? 'Bangladesh');

    if (strlen($name) < 2) {
        jR(['success' => false, 'error' => 'Name must be at least 2 characters.'], 422);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jR(['success' => false, 'error' => 'Valid email is required.'], 422);
    }

    $stmt = $conn->prepare("
        UPDATE blood_bank
        SET name = ?,
            email = ?,
            phone = ?,
            address_line = ?,
            city = ?,
            state = ?,
            country = ?
        WHERE id = ?
    ");

    if (!$stmt) {
        jR(['success' => false, 'error' => 'Profile update prepare failed: ' . $conn->error], 500);
    }

    $stmt->bind_param('sssssssi', $name, $email, $phone, $address, $city, $state, $country, $bankId);

    if (!$stmt->execute()) {
        jR(['success' => false, 'error' => 'Profile update failed: ' . $stmt->error], 500);
    }

    $stmt->close();

    jR(['success' => true, 'message' => 'Profile updated successfully.']);
}

function handleChangePasswordBank() {
    global $conn;
    $bankId = requireBank();
    $data = reqBody();

    $current = $data['current_password'] ?? '';
    $newPass = $data['new_password'] ?? '';
    $confirm = $data['confirm_password'] ?? '';

    if (!$current || !$newPass || !$confirm)
        jR(['success' => false, 'error' => 'All fields are required.'], 422);
    if ($newPass !== $confirm)
        jR(['success' => false, 'error' => 'New passwords do not match.'], 422);
    if (strlen($newPass) < 6)
        jR(['success' => false, 'error' => 'Password must be at least 6 characters.'], 422);

    $stmt = $conn->prepare("SELECT password_hash FROM blood_bank WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $bankId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($current, $row['password_hash']))
        jR(['success' => false, 'error' => 'Current password is incorrect.'], 403);

    $hash = password_hash($newPass, PASSWORD_DEFAULT);
    $upd = $conn->prepare("UPDATE blood_bank SET password_hash = ? WHERE id = ?");
    $upd->bind_param('si', $hash, $bankId);
    $upd->execute();
    $upd->close();

    jR(['success' => true, 'message' => 'Password changed successfully.']);
}

function handleLogout() {
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();

        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();

    jR(['success' => true, 'message' => 'Logged out.']);
}

/* ── Warning helpers ── */
function twExistsB($t){global $conn;$r=$conn->query("SHOW TABLES LIKE '".$conn->real_escape_string($t)."'");return $r&&$r->num_rows>0;}
function cwExistsB($t,$c){global $conn;$r=$conn->query("SHOW COLUMNS FROM `".str_replace('`','',$t)."` LIKE '".$conn->real_escape_string($c)."'");return $r&&$r->num_rows>0;}

function handleGetWarningsBank(){
    global $conn; $bid=requireBank();
    if(!twExistsB('admin_warning')) jR(['success'=>true,'warnings'=>[],'warning_count'=>0]);
    $d=cwExistsB('admin_warning','is_dismissed')?"AND (is_dismissed=0 OR is_dismissed IS NULL)":"";
    $planCol=cwExistsB('admin_warning','admin_improvement_plan')?',admin_improvement_plan':'';
    $s=$conn->prepare("SELECT id,message,status,sent_at,response,responded_at{$planCol} FROM admin_warning WHERE target_type='blood_bank' AND target_id=? AND status NOT IN ('blocked','cool_down') $d ORDER BY sent_at DESC");
    if(!$s) jR(['success'=>false,'error'=>$conn->error],500);
    $s->bind_param('i',$bid);$s->execute();$w=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    jR(['success'=>true,'warnings'=>$w,'warning_count'=>count($w)]);
}
function handleAcknowledgeWarningBank(){
    global $conn; $bid=requireBank();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    $now=date('Y-m-d H:i:s');
    if(cwExistsB('admin_warning','is_dismissed')){
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=?,is_dismissed=1,action_taken='acknowledged' WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$bid);
    } else {
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$bid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Warning acknowledged.']);
}
function handleSubmitImprovementBank(){
    global $conn; $bid=requireBank();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$plan=trim($data['plan']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($plan)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(cwExistsB('admin_warning','improvement_plan')){
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=?,is_dismissed=1,action_taken='improvement_submitted',improvement_plan=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$plan,$wid,$bid);
    } else {
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$bid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Improvement plan submitted.']);
}
function handleAppealWarningBank(){
    global $conn; $bid=requireBank();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$reason=trim($data['reason']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($reason)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(cwExistsB('admin_warning','appeal_reason')){
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=?,is_dismissed=1,action_taken='appealed',appeal_reason=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$reason,$wid,$bid);
    } else {
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$bid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Appeal submitted.']);
}

/* ── Debug endpoints (from YOURS) ── */
function handleDebug() {
    global $conn;
    $action = $_GET['action'] ?? ($_POST['action'] ?? '');
    $bankId = getBankIdFromSession();

    if ($action === 'test_bags') {
        $res = $conn->query("SELECT * FROM blood_bag");
        $bags = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
        jR(['success'=>true,'data'=>$bags,'message'=>'All bags in database']);
    }

    if ($action === 'diagnose') {
        $count = 0;
        if ($bankId) {
            $res = $conn->query("SELECT COUNT(*) as cnt FROM blood_bag WHERE blood_bank_id = " . (int)$bankId);
            $count = $res ? (int)$res->fetch_assoc()['cnt'] : 0;
        }
        jR(['success'=>true,'data'=>[
            'session_user_id' => $_SESSION['user_id'] ?? null,
            'session_role'    => $_SESSION['role'] ?? null,
            'bankId'          => $bankId,
            'bags_for_this_bank' => $count,
            'total_bags'      => (int)dbOne("SELECT COUNT(*) FROM blood_bag", 0)
        ]]);
    }
}

/* ── Clear Quarantine (from YOURS) ── */
function handleClearQuarantine() {
    global $conn;
    $bankId = requireBank();
    $data = reqBody();
    $bagId = trim($data['bag_id'] ?? '');

    if (!$bagId) jR(['success'=>false,'error'=>'Bag ID missing'], 422);

    $qrUpdate = columnExists('blood_bag', 'quarantine_reason')
        ? "status = 'available', quarantine_reason = NULL"
        : "status = 'available'";
    $stmt = $conn->prepare("UPDATE blood_bag SET $qrUpdate WHERE bag_barcode = ? AND blood_bank_id = ? AND status = 'quarantined'");
    $stmt->bind_param('si', $bagId, $bankId);
    $stmt->execute();
    if ($stmt->affected_rows === 0) jR(['success'=>false,'error'=>'Bag not found or not in quarantine'], 404);
    jR(['success'=>true,'message'=>'Quarantine cleared']);
}

/* ── Discard Quarantine (from YOURS) ── */
function handleDiscardQuarantine() {
    global $conn;
    $bankId = requireBank();
    $data = reqBody();
    $bagId = trim($data['bag_id'] ?? '');

    if (!$bagId) jR(['success'=>false,'error'=>'Bag ID missing'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status = 'discarded' WHERE bag_barcode = ? AND blood_bank_id = ? AND status = 'quarantined'");
    $stmt->bind_param('si', $bagId, $bankId);
    $stmt->execute();
    if ($stmt->affected_rows === 0) jR(['success'=>false,'error'=>'Bag not found or not in quarantine'], 404);
    jR(['success'=>true,'message'=>'Bag discarded']);
}

/* ── Hospital Needs (from YOURS) ── */
function handleHospitalNeeds() {
    global $conn;
    $bankId = requireBank();

    $hospitals = [];
    $sql = "SELECT h.name, h.id, br.blood_group, br.units_required, br.requested_at
            FROM blood_request br
            JOIN hospital h ON h.id = br.hospital_id
            WHERE br.blood_bank_id = " . (int)$bankId . " AND br.status = 'pending'
            ORDER BY br.requested_at DESC";
    $res = $conn->query($sql);
    $grouped = [];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $hid = (int)$row['id'];
            if (!isset($grouped[$hid])) {
                $grouped[$hid] = [
                    'name' => $row['name'],
                    'needs' => [],
                    'last_notified' => 'Not yet notified'
                ];
            }
            $grouped[$hid]['needs'][] = $row['blood_group'] . ' (' . (int)$row['units_required'] . ' unit' . ((int)$row['units_required'] > 1 ? 's' : '') . ')';
        }
    }
    foreach ($grouped as $g) {
        $hospitals[] = $g;
    }
    jR(['success'=>true,'hospitals'=>$hospitals]);
}

/* ── Drone Stats (from YOURS) ── */
function handleDroneStats() {
    global $conn;
    $bankId = requireBank();
    $stats = ['available' => 0, 'in_flight' => 0, 'charging' => 0, 'maintenance' => 0, 'deliveries_today' => 0];
    $res = $conn->query("SELECT status, COUNT(*) as cnt FROM drone WHERE blood_bank_id = " . (int)$bankId . " GROUP BY status");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $st = $row['status'];
            if ($st === 'idle') $stats['available'] = (int)$row['cnt'];
            elseif ($st === 'en_route') $stats['in_flight'] = (int)$row['cnt'];
            elseif ($st === 'charging') $stats['charging'] = (int)$row['cnt'];
            elseif ($st === 'maintenance') $stats['maintenance'] = (int)$row['cnt'];
        }
    }
    $res2 = $conn->query("SELECT COUNT(*) as cnt FROM drone_dispatch dd
                          JOIN drone d ON d.id = dd.drone_id
                          WHERE d.blood_bank_id = " . (int)$bankId . " AND DATE(dd.created_at) = CURDATE()");
    if ($res2) $stats['deliveries_today'] = (int)$res2->fetch_assoc()['cnt'];
    jR(['success'=>true,'stats'=>$stats]);
}

/* ── Drone Deliveries (from YOURS) ── */
function handleDroneDeliveries() {
    global $conn;
    $bankId = requireBank();
    $deliveries = [];
    $sql = "SELECT dd.id, d.drone_code as drone, h.name as destination, br.blood_group, br.units_required,
                   dd.estimated_arrival, dd.status, dd.created_at as departed
            FROM drone_dispatch dd
            JOIN drone d ON d.id = dd.drone_id
            LEFT JOIN blood_request br ON br.id = dd.blood_request_id
            LEFT JOIN hospital h ON h.id = br.hospital_id
            WHERE dd.source_bank_id = " . (int)$bankId . " AND dd.status IN ('scheduled','in_transit')
            ORDER BY dd.created_at DESC";
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $deliveries[] = $row;
        }
    }
    jR(['success'=>true,'deliveries'=>$deliveries]);
}

/* ── Drone Weekly Stats (from YOURS) ── */
function handleDroneWeekly() {
    global $conn;
    $bankId = requireBank();
    $days = ['Mon' => 0, 'Tue' => 0, 'Wed' => 0, 'Thu' => 0, 'Fri' => 0, 'Sat' => 0, 'Sun' => 0];
    $sql = "SELECT DAYNAME(created_at) as dayname, COUNT(*) as cnt
            FROM drone_dispatch
            WHERE source_bank_id = " . (int)$bankId . " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DAYNAME(created_at)";
    $res = $conn->query($sql);
    $dayMap = ['Monday' => 'Mon', 'Tuesday' => 'Tue', 'Wednesday' => 'Wed', 'Thursday' => 'Thu', 'Friday' => 'Fri', 'Saturday' => 'Sat', 'Sunday' => 'Sun'];
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $dn = $dayMap[$row['dayname']] ?? null;
            if ($dn) $days[$dn] = (int)$row['cnt'];
        }
    }
    jR(['success'=>true,'weekly'=>$days]);
}

/* ── Drone Maintenance (from YOURS) ── */
function handleDroneMaintenance() {
    global $conn;
    $bankId = requireBank();
    $items = [];
    $res = $conn->query("SELECT drone_code as id, status, NULL as date FROM drone WHERE blood_bank_id = " . (int)$bankId . " AND status = 'maintenance'");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $items[] = ['id' => $row['id'], 'task' => 'Scheduled maintenance', 'date' => $row['date'], 'status' => 'Pending'];
        }
    }
    jR(['success'=>true,'maintenance'=>$items]);
}