<?php
/* ============================================================
   BloodBridge — hospital_api.php  (CORRECTED per spec images)
   Session: role='blood-bank', sub_role='hospital', user_id=blood_bank.id

   Feature → Correct Table mapping:
   #03 Submit blood request  → blood_request + hospital + request_timeline
   #04 Accept expiry offers  → expiry_alert + blood_bag + blood_request
   #06 View incoming bag     → blood_bag + blood_culture_test + transfusion
   #08 Rate blood bank       → bank_review + blood_bank
   #15 Register patients     → patient_registry + users
   #16 Auto-approval         → approval_step + blood_request + approval_rule
   ============================================================ */

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);
ob_start();

require_once __DIR__ . '/config.php';
ob_clean();

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

function jR($data, $code = 200) {
    ob_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireHospital() {
    $uid     = $_SESSION['user_id'] ?? null;
    $role    = $_SESSION['role']    ?? null;   // login.php sets this to 'blood_bank' (account_type)
    $subRole = $_SESSION['sub_role'] ?? null;  // login.php sets this to 'hospital'   (blood_bank.role)

    if ($uid === null || !is_numeric($uid)) {
        jR(['success'=>false,'error'=>'Unauthorised. Please log in.'], 401);
    }

    // login.php stores: role='blood_bank' (underscore), sub_role='hospital'
    if ($role === 'blood_bank' && $subRole === 'hospital') {
        return (int)$uid;
    }

    jR(['success'=>false,'error'=>'Unauthorised. Please log in.'], 401);
}

/* Helper: resolve hospital.id from blood_bank.id.
   Both tables use the same ID (signup.php inserts both with $newId). */
function getHospitalId($conn, $bid) {
    $stmt = $conn->prepare("SELECT id FROM hospital WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $bid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? (int)$row['id'] : null;
}

if (!$conn || $conn->connect_error) {
    jR(['success'=>false,'error'=>'Database connection failed.'], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'dashboard':       handleDashboard();      break;
    case 'requests':        handleRequests();       break;
    case 'submit_request':  handleSubmitRequest();  break;
    case 'deliveries':      handleDeliveries();     break;
    case 'patients':        handlePatients();       break;
    case 'add_patient':     handleAddPatient();     break;
    case 'blood_banks':     handleBloodBanks();     break;
    case 'rate_bank':       handleRateBank();       break;
    case 'my_reviews':      handleMyReviews();      break;
    case 'profile':         handleProfile();        break;
    case 'update_profile':        handleUpdateProfile();             break;
    case 'get_warnings':           handleGetWarnings_hosp();          break;
    case 'acknowledge_warning':    handleAcknowledgeWarning_hosp();   break;
    case 'submit_improvement':     handleSubmitImprovement_hosp();    break;
    case 'appeal_warning':         handleAppealWarning_hosp();        break;
    case 'emergency_requests':       handleEmergencyRequestsListHosp(); break;
    case 'emergency_approve':        handleEmergencyApproveHosp();      break;
    case 'emergency_ignore':         handleEmergencyIgnoreHosp();       break;
    case 'my_voice_requests':        handleMyVoiceRequestsHosp();       break;
    case 'send_emergency_broadcast': handleSendEmergencyBroadcastHosp(); break;
    case 'sent_broadcasts':          handleSentBroadcastsHosp();         break;
    case 'broadcasts_list':          handleBroadcastsListHosp();         break;
    case 'promises':                 handlePromises();                   break;
    case 'verify_promise':           handleVerifyPromise();              break;
    case 'update_promise_status':    handleUpdatePromiseStatus();        break;
    case 'reschedule_promise':       handleReschedulePromise();          break;
    case 'track_request':            handleTrackRequestHosp();           break;
    case 'inventory':                handleInventoryHosp();              break;
    case 'add_bag':                  handleAddBagHosp();                 break;
    case 'allocate_bag':             handleAllocateBagHosp();            break;
    case 'discard_bag':              handleDiscardBagHosp();             break;
    default:
        jR(['success'=>false,'error'=>'Unknown action: '.htmlspecialchars($action)], 400);
}

/* ══════════════════════════════════════════════
   EMERGENCY REQUESTS — list, approve, ignore (hospital)
══════════════════════════════════════════════ */
function handleEmergencyRequestsListHosp() {
    global $conn;
    $hospId = requireHospital();

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
          AND er.requester_user_id != $hospId
        ORDER BY er.created_at DESC
        LIMIT 50
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    /* Check hospital blood stock for can_fulfill flag */
    $stockGroups = [];
    $stockRes = $conn->query("
        SELECT DISTINCT blood_group FROM blood_bag
        WHERE blood_bank_id = $hospId
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

function handleEmergencyApproveHosp() {
    global $conn;
    $hospId = requireHospital();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jR(['success' => false, 'error' => 'request_id required.'], 422);

    /* Get request details */
    $reqRow = $conn->query("SELECT id, extracted_blood_group AS blood_group, requester_user_id, status FROM emergency_request WHERE id = $requestId AND status = 'pending' LIMIT 1");
    if (!$reqRow || !($req = $reqRow->fetch_assoc()))
        jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);

    /* Prevent self-approval */
    if ((int)$req['requester_user_id'] === $hospId)
        jR(['success' => false, 'error' => 'You cannot approve your own emergency broadcast.'], 403);

    /* Check blood stock */
    $bg = $conn->real_escape_string($req['blood_group']);
    $stockCheck = $conn->query("SELECT COUNT(*) AS cnt FROM blood_bag WHERE blood_bank_id = $hospId AND blood_group = '$bg' AND status = 'available' AND expiry_date >= CURDATE()");
    $stock = $stockCheck ? (int)$stockCheck->fetch_assoc()['cnt'] : 0;
    if ($stock < 1)
        jR(['success' => false, 'error' => "Your hospital does not have $bg blood available. Cannot fulfill this request."], 422);

    /* Approve */
    $stmt = $conn->prepare("UPDATE emergency_request SET status = 'assigned', assigned_to_user_id = ?, processed_at = NOW() WHERE id = ? AND status = 'pending'");
    $stmt->bind_param('ii', $hospId, $requestId);
    $stmt->execute();
    if ($stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Request not found or already processed.'], 404);
    $stmt->close();

    /* Notify requester */
    if ($req['requester_user_id']) {
        $rid = (int)$req['requester_user_id'];
        $hospInfo = $conn->query("SELECT name, phone FROM blood_bank WHERE id = $hospId LIMIT 1");
        $h = $hospInfo ? $hospInfo->fetch_assoc() : [];
        $hName  = $conn->real_escape_string($h['name']  ?? 'A hospital');
        $hPhone = $conn->real_escape_string($h['phone'] ?? '');
        $conn->query("INSERT INTO notification (user_id, title, message) VALUES ($rid, '✅ Emergency Request Fulfilled', '$hName has confirmed they can provide $bg blood for your emergency request. Contact: $hPhone')");
    }

    jR(['success' => true, 'message' => 'Emergency request approved. Requester has been notified.', 'blood_group' => $bg, 'stock' => $stock]);
}

function handleEmergencyIgnoreHosp() {
    global $conn;
    requireHospital();
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

function handleMyVoiceRequestsHosp() {
    global $conn;
    $uid = requireHospital();
    $res = $conn->prepare("SELECT id, extracted_blood_group AS blood_group, extracted_name AS requester_name, extracted_location AS location, requester_phone AS phone, voice_transcript, status, matched_donor_count, created_at AS requested_at FROM emergency_request WHERE requester_user_id = ? ORDER BY created_at DESC LIMIT 50");
    $res->bind_param('i', $uid);
    $res->execute();
    $result = $res->get_result();
    $requests = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $res->close();
    jR(['success' => true, 'requests' => $requests]);
}

/* ══════════════════════════════════════════════════════════
   EMERGENCY BROADCAST — hospital sends & receives broadcasts
═══════════════════════════════════════════════════════════ */

function handleSendEmergencyBroadcastHosp() {
    global $conn;
    $hospId = requireHospital();
    $data = reqBodyHosp();

    $bloodGroup = trim($data['blood_group'] ?? '');
    $units = (int)($data['units'] ?? 1);
    $notes = trim($data['notes'] ?? '');
    $targets = $data['targets'] ?? [];

    if (!preg_match('/^(A|B|AB|O)[+-]$/', $bloodGroup))
        jR(['success' => false, 'error' => 'Valid blood group required (e.g. A+).'], 422);
    if ($units < 1 || $units > 50) $units = 1;

    if (empty($targets))
        jR(['success' => false, 'error' => 'Select at least one target (Blood Banks, Hospitals, etc.).'], 422);

    $stmt = $conn->prepare("SELECT name, phone FROM blood_bank WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $hospId);
    $stmt->execute();
    $hosp = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $hospName = $hosp['name'] ?? 'Hospital #' . $hospId;
    $hospPhone = $hosp['phone'] ?? '';

    /* Insert emergency request with hospital as requester */
    $stmt = $conn->prepare("
        INSERT INTO emergency_request
            (requester_user_id, extracted_name, extracted_blood_group,
             extracted_location, requester_phone, required_units,
             status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    ");
    $stmt->bind_param('issssi', $hospId, $hospName, $bloodGroup, $notes, $hospPhone, $units);
    $stmt->execute();
    $emergencyId = $stmt->insert_id;
    $stmt->close();

    $notifiedCount = 0;
    $institutionCount = 0;

    /* Notify donor_recipients with matching blood group */
    if (in_array('donor_recipient', $targets, true)) {
        $bg = $conn->real_escape_string($bloodGroup);
        $safeHospName = $conn->real_escape_string($hospName);
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
                    '🚨 $safeHospName needs $bg blood urgently. Please respond if you can donate.')");
                $notifiedCount++;
            }
        }
    }

    /* Collect institution IDs */
    $institutionIds = [];

    if (in_array('blood_bank', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $hospId AND role = 'blood_bank' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    if (in_array('hospital', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $hospId AND role = 'hospital' AND status = 'active'");
        while ($r = $res->fetch_assoc()) $institutionIds[] = (int)$r['id'];
    }

    if (in_array('medical_college', $targets, true)) {
        $res = $conn->query("SELECT id FROM blood_bank WHERE id != $hospId AND role = 'medical_college' AND status = 'active'");
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

function handleBroadcastsListHosp() {
    global $conn;
    $hospId = requireHospital();

    $res = $conn->query("
        SELECT er.*, bb.name AS sender_name, bb.city
        FROM emergency_request er
        LEFT JOIN blood_bank bb ON bb.id = er.requester_user_id
        WHERE er.requester_user_id != $hospId
          AND er.status = 'pending'
        ORDER BY er.created_at DESC
        LIMIT 50
    ");
    $broadcasts = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'broadcasts'=>$broadcasts]);
}

function handleSentBroadcastsHosp() {
    global $conn;
    $hospId = requireHospital();

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
    $stmt->bind_param('i', $hospId);
    $stmt->execute();
    $broadcasts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success' => true, 'broadcasts' => $broadcasts]);
}

/* ── Helper for request body ── */
function reqBodyHosp() {
    $raw  = file_get_contents('php://input');
    $json = json_decode($raw, true);
    return is_array($json) ? $json : $_POST;
}

/* ── Helper: create notification ── */
function notifyUserHosp($userId, $title, $message) {
    global $conn;
    if (!$userId) return;
    $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message, created_at) VALUES (?, ?, ?, NOW())");
    if (!$stmt) return;
    $stmt->bind_param('iss', $userId, $title, $message);
    $stmt->execute();
    $stmt->close();
}

/* ══════════════════════════════════════════════════════════
   PROMISES — donor promises for this hospital
═══════════════════════════════════════════════════════════ */

function handlePromises() {
    global $conn;
    $hospId = requireHospital();
    $status = trim($_GET['status'] ?? '');

    $where = "dp.blood_bank_id = ?";
    $types = 'i';
    $params = [$hospId];

    if ($status !== '') {
        $where .= " AND dp.status = ?";
        $types .= 's';
        $params[] = $status;
    }

    $sql = "
        SELECT dp.*, u.full_name AS donor_name, dr.blood_group
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE $where
        ORDER BY dp.promise_time DESC
        LIMIT 100
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) jR(['success'=>false,'error'=>'Promises query failed: '.$conn->error], 500);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $promises = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jR(['success'=>true,'promises'=>$promises]);
}

function handleVerifyPromise() {
    global $conn;
    $hospId = requireHospital();
    $data = reqBodyHosp();

    $code = trim($data['confirmation_code'] ?? '');
    if ($code === '') jR(['success'=>false,'error'=>'Confirmation code is required.'], 422);

    $stmt = $conn->prepare("
        SELECT dp.*, u.full_name AS donor_name, dr.blood_group
        FROM donation_promise dp
        LEFT JOIN users u ON u.id = dp.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        WHERE dp.blood_bank_id = ? AND dp.confirmation_code = ?
        LIMIT 1
    ");
    if (!$stmt) jR(['success'=>false,'error'=>'Verify query failed: '.$conn->error], 500);
    $stmt->bind_param('is', $hospId, $code);
    $stmt->execute();
    $promise = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$promise) jR(['success'=>false,'error'=>'Promise code not found for this hospital.'], 404);
    jR(['success'=>true,'promise'=>$promise]);
}

function handleUpdatePromiseStatus() {
    global $conn;
    $hospId = requireHospital();
    $data = reqBodyHosp();

    $promiseId = (int)($data['promise_id'] ?? 0);
    $status    = trim($data['status'] ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!in_array($status, ['fulfilled','broken'], true)) jR(['success'=>false,'error'=>'Status must be fulfilled or broken.'],422);

    $chk = $conn->prepare("SELECT id, donor_user_id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $hospId);
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
            $ins = $conn->prepare("INSERT INTO donation (donor_user_id, blood_bank_id, donation_promise_id, donation_date, status, created_at) VALUES (?, ?, ?, NOW(), 'completed', NOW())");
            if ($ins) {
                $ins->bind_param('iii', $donorId, $hospId, $promiseId);
                $ins->execute();
                $donationId = $ins->insert_id;
                $ins->close();

                $conn->query("
                    UPDATE donor_recipient
                    SET total_donations = (SELECT COUNT(*) FROM donation_promise WHERE donor_user_id = $donorId AND status = 'fulfilled'),
                        last_donation_date = NOW()
                    WHERE user_id = $donorId
                ");

                $barcode    = 'BB-'.strtoupper(substr(md5(uniqid((string)$donorId,true)),0,8));
                $expiryDate = date('Y-m-d', strtotime('+42 days'));
                $bgRes      = $conn->query("SELECT blood_group FROM donor_recipient WHERE user_id=$donorId LIMIT 1");
                $bloodGroup = ($bgRes && ($bgRow=$bgRes->fetch_assoc())) ? ($bgRow['blood_group']??'O+') : 'O+';

                $bagStmt = $conn->prepare("INSERT INTO blood_bag (blood_bank_id, bag_barcode, blood_group, donation_id, volume_ml, collection_date, expiry_date, status, storage_location, culture_test_status, created_at) VALUES (?, ?, ?, ?, 450, NOW(), ?, 'available', 'Freezer A1', 'pending', NOW())");
                if ($bagStmt) {
                    $bagStmt->bind_param('issis', $hospId, $barcode, $bloodGroup, $donationId, $expiryDate);
                    $bagStmt->execute();
                    $bagStmt->close();
                }
            }
        }
    }

    jR(['success'=>true,'message'=>'Promise status updated to '.$status.'.']);
}

function handleReschedulePromise() {
    global $conn;
    $hospId = requireHospital();
    $data = reqBodyHosp();

    $promiseId = (int)($data['promise_id'] ?? 0);
    $newDate   = trim($data['new_date'] ?? '');

    if (!$promiseId) jR(['success'=>false,'error'=>'promise_id required.'],422);
    if (!$newDate)   jR(['success'=>false,'error'=>'new_date required.'],422);

    $ts = strtotime($newDate);
    if (!$ts) jR(['success'=>false,'error'=>'Invalid date format.'],422);
    $formatted = date('Y-m-d H:i:s', $ts);

    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND blood_bank_id=? LIMIT 1");
    $chk->bind_param('ii', $promiseId, $hospId);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jR(['success'=>false,'error'=>'Promise not found.'],404);
    $chk->close();

    $stmt = $conn->prepare("UPDATE donation_promise SET promise_time=?, status='pending' WHERE id=?");
    $stmt->bind_param('si', $formatted, $promiseId);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>$stmt->error],500);
    $stmt->close();

    jR(['success'=>true,'message'=>'Promise rescheduled successfully.']);
}

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
function handleDashboard() {
    global $conn;
    $bid    = requireHospital();
    $hospId = getHospitalId($conn, $bid);

    /* Hospital info */
    $stmt = $conn->prepare("SELECT id,name,registration_no,email,phone,city,address_line,created_at FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $bid); $stmt->execute();
    $hosp = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$hosp) jR(['success'=>false,'error'=>'Hospital not found.'], 404);

    /* ── STAT 1: Open blood requests  (blood_request table) ── */
    $hCond = $hospId ? "AND br.hospital_id = $hospId" : '';
    $r = $conn->query("SELECT COUNT(*) AS c FROM blood_request br WHERE br.status IN ('pending','approved') $hCond");
    $openRequests = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* ── STAT 2: Pending deliveries — blood_bag assigned to this hospital
       Feature #06: blood_bag + blood_culture_test + transfusion
       Count blood_bags that are 'in_transit' or linked to an active drone_dispatch ── */
    $hBagCond = $hospId ? "AND t.hospital_id = $hospId" : '';
    $r = $conn->query("
        SELECT COUNT(DISTINCT bb.id) AS c
        FROM blood_bag bb
        LEFT JOIN transfusion t ON t.blood_bag_id = bb.id
        WHERE bb.culture_test_status IN ('passed','pending')
          AND bb.status NOT IN ('used','expired','discarded','available')
          $hBagCond
    ");
    $pendingDel = (int)($r ? $r->fetch_assoc()['c'] : 0);
    /* Fallback: also count drone dispatches in transit */
    if ($pendingDel === 0) {
        $r = $conn->query("SELECT COUNT(*) AS c FROM drone_dispatch WHERE status IN ('dispatched','in_transit','en_route')");
        $pendingDel = (int)($r ? $r->fetch_assoc()['c'] : 0);
    }

    /* ── STAT 4: Registered patients (patient_registry) ── */
    $r = $conn->query("SELECT COUNT(*) AS c FROM patient_registry");
    $patients = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* ── Recent open requests (blood_request + request_timeline) ── */
    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, br.request_hash, br.notes,
               bb.name  AS blood_bank_name,
               rt.status AS timeline_status, rt.changed_at AS last_update
        FROM blood_request br
        LEFT JOIN blood_bank bb       ON bb.id = br.blood_bank_id
        LEFT JOIN request_timeline rt ON rt.request_id = br.id
              AND rt.id = (SELECT MAX(id) FROM request_timeline WHERE request_id = br.id)
        WHERE br.status IN ('pending','approved','in_transit')
        $hCond
        ORDER BY FIELD(br.urgency,'emergency','urgent','normal') ASC,
                 br.requested_at ASC
        LIMIT 5
    ";
    $r = $conn->query($sql);
    $recentRequests = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];

    /* ── Incoming blood bags status (blood_bag + blood_culture_test) for preview ── */
    $bagHCond = $hospId ? "AND t.hospital_id = $hospId" : '';
    $r = $conn->query("
        SELECT bb.id AS bag_id, bb.bag_barcode, bb.blood_group,
               bb.status AS bag_status, bb.culture_test_status,
               bb.quarantine_reason, bb.expiry_date,
               bct.result AS culture_result, bct.pathogen_detected,
               bk.name AS source_bank_name,
               dd.status AS dispatch_status, dd.estimated_arrival,
               dr.drone_code
        FROM blood_bag bb
        LEFT JOIN blood_culture_test bct ON bct.blood_bag_id = bb.id
              AND bct.id = (SELECT MAX(id) FROM blood_culture_test WHERE blood_bag_id = bb.id)
        LEFT JOIN blood_bank bk ON bk.id = bb.blood_bank_id
        LEFT JOIN transfusion t ON t.blood_bag_id = bb.id
        LEFT JOIN blood_request breq ON breq.id = t.request_id
        LEFT JOIN drone_dispatch dd ON dd.blood_request_id = breq.id
              AND dd.status IN ('dispatched','in_transit','en_route')
        LEFT JOIN drone dr ON dr.id = dd.drone_id
        WHERE bb.status NOT IN ('expired','discarded','available')
        $bagHCond
        ORDER BY dd.estimated_arrival ASC
        LIMIT 5
    ");
    $incomingBags = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
    /* Fallback: show active drone dispatches if no transfusion-linked bags found */
    if (empty($incomingBags)) {
        $r = $conn->query("
            SELECT dd.id, dd.status AS dispatch_status, dd.estimated_arrival,
                   dr.drone_code, br.blood_group, br.units_required,
                   bk.name AS source_bank_name,
                   NULL AS bag_barcode, NULL AS culture_test_status,
                   NULL AS culture_result, NULL AS quarantine_reason
            FROM drone_dispatch dd
            INNER JOIN drone dr ON dr.id = dd.drone_id
            INNER JOIN blood_request br ON br.id = dd.blood_request_id
            LEFT JOIN blood_bank bk ON bk.id = dd.source_bank_id
            WHERE dd.status IN ('dispatched','in_transit','en_route')
            ORDER BY dd.created_at DESC LIMIT 5
        ");
        $incomingBags = $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
    }

    /* ── Critical: unmatched urgent request ── */
    $r = $conn->query("
        SELECT br.id, br.blood_group, br.urgency, br.requested_at, br.request_hash
        FROM blood_request br
        WHERE br.urgency IN ('emergency','urgent')
          AND br.status = 'pending'
          $hCond
        ORDER BY br.requested_at ASC LIMIT 1
    ");
    $critRequest = ($r && $r->num_rows > 0) ? $r->fetch_assoc() : null;

    /* ── Inventory summary ── */
    $invStmt = $conn->prepare("SELECT blood_group, COUNT(*) AS total, SUM(CASE WHEN expiry_date >= CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= 7 THEN 1 ELSE 0 END) AS expiring7 FROM blood_bag WHERE blood_bank_id = ? AND status = 'available' GROUP BY blood_group");
    $invData = [];
    if ($invStmt) { $invStmt->bind_param('i', $bid); $invStmt->execute(); $invData = $invStmt->get_result()->fetch_all(MYSQLI_ASSOC); $invStmt->close(); }

    /* Expiring soon (≤7 days) */
    $expiringSoon = [];
    $res = $conn->query("
        SELECT id, bag_barcode, blood_group, storage_location, volume_ml,
               expiry_date, DATEDIFF(expiry_date, CURDATE()) AS days_left
        FROM blood_bag
        WHERE blood_bank_id = $bid
          AND status = 'available'
          AND expiry_date >= CURDATE()
          AND DATEDIFF(expiry_date, CURDATE()) <= 7
        ORDER BY expiry_date ASC
        LIMIT 8
    ");
    if ($res) $expiringSoon = $res->fetch_all(MYSQLI_ASSOC);

    jR([
        'success'  => true,
        'hospital' => [
            'id'              => (int)$hosp['id'],
            'hospital_id'     => $hospId,
            'name'            => $hosp['name'],
            'registration_no' => $hosp['registration_no'] ?? 'HOS-'.str_pad($hosp['id'],6,'0',STR_PAD_LEFT),
            'email'           => $hosp['email'],
            'phone'           => $hosp['phone'],
            'city'            => $hosp['city'] ?? '',
            'address'         => $hosp['address_line'] ?? '',
            'member_since'    => date('Y', strtotime($hosp['created_at'])),
        ],
        'stats' => [
            'open_requests'      => $openRequests,
            'pending_deliveries' => $pendingDel,
            'patients'           => $patients,
        ],
        'recent_requests' => $recentRequests,
        'incoming_bags'   => $incomingBags,
        'crit_request'    => $critRequest,
        'inventory'       => $invData,
        'expiring_soon'   => $expiringSoon,
    ]);
}

/* ══════════════════════════════════════════════
   #03 BLOOD REQUESTS PAGE
   Tables: blood_request + hospital + request_timeline
══════════════════════════════════════════════ */
function handleRequests() {
    global $conn;
    $bid    = requireHospital();
    $hospId = getHospitalId($conn, $bid);
    $status = $_GET['status'] ?? 'all';

    $conditions = ['1=1'];
    if ($hospId)            $conditions[] = "br.hospital_id = $hospId";
    if ($status !== 'all')  $conditions[] = "br.status = '".$conn->real_escape_string($status)."'";
    $where = implode(' AND ', $conditions);

    $res = $conn->query("
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, br.request_hash, br.notes,
               br.approved_at, br.delivered_at,
               bb.name  AS blood_bank_name,
               rt.status AS timeline_status,
               rt.changed_at AS last_timeline_update,
               rt.remarks AS timeline_remarks
        FROM blood_request br
        LEFT JOIN blood_bank bb       ON bb.id = br.blood_bank_id
        LEFT JOIN request_timeline rt ON rt.request_id = br.id
              AND rt.id = (SELECT MAX(id) FROM request_timeline WHERE request_id = br.id)
        WHERE $where
        ORDER BY br.requested_at DESC
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true, 'requests'=>$requests]);
}

/* ══════════════════════════════════════════════
   #03 SUBMIT REQUEST
   Tables: blood_request + hospital + request_timeline
══════════════════════════════════════════════ */
function handleSubmitRequest() {
    global $conn;
    $bid    = requireHospital();
    $hospId = getHospitalId($conn, $bid);
    $data   = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $bloodGroup  = trim($data['blood_group']    ?? '');
    $units       = (int)($data['units_required'] ?? 1);
    $urgency     = trim($data['urgency']         ?? 'normal');
    $bankId      = (int)($data['blood_bank_id']  ?? 0) ?: null;
    $notes       = trim($data['notes']           ?? '');
    $requiredBy  = trim($data['required_by']     ?? '');

    if (!$bloodGroup)        jR(['success'=>false,'error'=>'Blood group required.'], 422);
    if ($units < 1 || $units > 10) jR(['success'=>false,'error'=>'Units must be 1–10.'], 422);

    $validUrgency = ['normal','urgent','emergency'];
    if (!in_array($urgency, $validUrgency)) $urgency = 'normal';

    /* Generate blockchain-style request hash */
    $hash = strtoupper(substr(md5(uniqid(rand(), true)), 0, 12));

    $stmt = $conn->prepare("
        INSERT INTO blood_request
            (blood_bank_id, hospital_id, blood_group, units_required,
             urgency, status, request_hash, requested_at, required_by, notes)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), ?, ?)
    ");
    $rb = !empty($requiredBy) ? $requiredBy : null;
    /* Types: bankId=i, hospId=i, bloodGroup=s, units=i, urgency=s, hash=s, required_by=s, notes=s */
    $stmt->bind_param('iisissss', $bankId, $hospId, $bloodGroup, $units, $urgency, $hash, $rb, $notes);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Submit failed: '.$conn->error], 500);
    $newId = $conn->insert_id;
    $stmt->close();

    /* Insert first request_timeline entry (feature #03 — blockchain tracking) */
    $stmt = $conn->prepare("
        INSERT INTO request_timeline (request_id, status, changed_by_user_id, remarks)
        VALUES (?, 'pending', ?, 'Request submitted by hospital representative')
    ");
    $stmt->bind_param('ii', $newId, $bid);
    $stmt->execute();
    $stmt->close();

    jR([
        'success'    => true,
        'message'    => 'Request #REQ-'.str_pad($newId,4,'0',STR_PAD_LEFT).' submitted.',
        'request_id' => $newId,
        'hash'       => $hash,
    ]);
}

/* ══════════════════════════════════════════════
   #06 DELIVERIES / INCOMING BLOOD BAG STATUS
   Tables: blood_bag + blood_culture_test + transfusion
   (drone_dispatch used as fallback for ETA data)
══════════════════════════════════════════════ */
function handleDeliveries() {
    global $conn;
    $bid    = requireHospital();
    $hospId = getHospitalId($conn, $bid);

    /* Stats from blood_bag perspective */
    $hCond = $hospId ? "AND t.hospital_id = $hospId" : '';

    /* Total incoming: bags not yet used/expired that have a transfusion record for this hospital */
    $r = $conn->query("
        SELECT COUNT(DISTINCT bb.id) AS c
        FROM blood_bag bb
        INNER JOIN transfusion t ON t.blood_bag_id = bb.id
        WHERE bb.status NOT IN ('expired','discarded') $hCond
    ");
    $total = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* In transit via drone */
    $r = $conn->query("SELECT COUNT(*) AS c FROM drone_dispatch WHERE status IN ('dispatched','in_transit','en_route')");
    $inTransit = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* Delivered today */
    $r = $conn->query("SELECT COUNT(*) AS c FROM drone_dispatch WHERE status IN ('delivered','completed') AND DATE(actual_arrival)=CURDATE()");
    $deliveredToday = (int)($r ? $r->fetch_assoc()['c'] : 0);

    /* Main query: blood_bag + blood_culture_test + transfusion (feature #06 exact tables) */
    $bagHCond = $hospId ? "AND t.hospital_id = $hospId" : '';
    $res = $conn->query("
        SELECT bb.id AS bag_id, bb.bag_barcode, bb.blood_group,
               bb.status AS bag_status, bb.culture_test_status,
               bb.quarantine_reason, bb.expiry_date, bb.volume_ml,
               bb.storage_location,
               bct.id AS test_id, bct.result AS culture_result,
               bct.pathogen_detected, bct.test_date, bct.comments AS test_comments,
               t.id AS transfusion_id, t.issued_at,
               t.crossmatch_result, t.reaction_notes,
               bk.name AS source_bank_name,
               dd.status AS dispatch_status, dd.estimated_arrival,
               dd.actual_arrival, dr.drone_code, dr.battery_level
        FROM blood_bag bb
        LEFT JOIN blood_culture_test bct ON bct.blood_bag_id = bb.id
              AND bct.id = (SELECT MAX(id) FROM blood_culture_test WHERE blood_bag_id = bb.id)
        LEFT JOIN blood_bank bk ON bk.id = bb.blood_bank_id
        LEFT JOIN transfusion t ON t.blood_bag_id = bb.id
        LEFT JOIN blood_request breq ON breq.id = t.request_id
        LEFT JOIN drone_dispatch dd ON dd.blood_request_id = breq.id
              AND dd.id = (SELECT MAX(id) FROM drone_dispatch WHERE blood_request_id = breq.id)
        LEFT JOIN drone dr ON dr.id = dd.drone_id
        WHERE bb.status NOT IN ('expired','discarded')
        $bagHCond
        ORDER BY dd.estimated_arrival ASC, bb.id DESC
    ");
    $bags = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    /* Fallback: if no transfusion-linked bags, return active drone dispatches */
    if (empty($bags)) {
        $res = $conn->query("
            SELECT dd.id AS bag_id, NULL AS bag_barcode,
                   br.blood_group, dd.status AS bag_status,
                   NULL AS culture_test_status, NULL AS quarantine_reason,
                   NULL AS expiry_date, NULL AS volume_ml,
                   NULL AS culture_result, NULL AS pathogen_detected,
                   NULL AS test_date, NULL AS transfusion_id,
                   dd.status AS dispatch_status,
                   dd.estimated_arrival, dd.actual_arrival,
                   dr.drone_code, dr.battery_level,
                   bk.name AS source_bank_name,
                   br.units_required
            FROM drone_dispatch dd
            INNER JOIN drone dr ON dr.id = dd.drone_id
            INNER JOIN blood_request br ON br.id = dd.blood_request_id
            LEFT JOIN blood_bank bk ON bk.id = dd.source_bank_id
            ORDER BY dd.created_at DESC
        ");
        $bags = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    }

    jR([
        'success'         => true,
        'total'           => $total ?: count($bags),
        'in_transit'      => $inTransit,
        'delivered_today' => $deliveredToday,
        'bags'            => $bags,
    ]);
}

/* ══════════════════════════════════════════════
   #15 PATIENTS
   Tables: patient_registry + users
══════════════════════════════════════════════ */
function handlePatients() {
    global $conn;
    requireHospital();
    $search = trim($_GET['search'] ?? '');

    $where = '1=1';
    if ($search) {
        $s = $conn->real_escape_string($search);
        $where = "(pr.full_name LIKE '%$s%' OR pr.blood_group LIKE '%$s%' OR pr.national_id LIKE '%$s%' OR pr.phone LIKE '%$s%')";
    }

    /* Join users table to check if patient has a user account (feature #15) */
    $res = $conn->query("
        SELECT pr.id, pr.national_id, pr.full_name, pr.blood_group,
               pr.phone, pr.address, pr.last_blood_request, pr.created_at,
               pr.date_of_birth,
               u.id AS user_id, u.email AS user_email
        FROM patient_registry pr
        LEFT JOIN users u ON u.phone = pr.phone OR u.id = (
            SELECT id FROM users WHERE full_name = pr.full_name LIMIT 1
        )
        WHERE $where
        ORDER BY pr.created_at DESC
    ");
    $patients = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true, 'patients'=>$patients]);
}

/* ══════════════════════════════════════════════
   #15 ADD PATIENT
   Tables: patient_registry + users
══════════════════════════════════════════════ */
function handleAddPatient() {
    global $conn;
    requireHospital();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $name    = trim($data['full_name']   ?? '');
    $bg      = trim($data['blood_group'] ?? '');
    $phone   = trim($data['phone']       ?? '');
    $natId   = trim($data['national_id'] ?? '');
    $address = trim($data['address']     ?? '');
    $dob     = trim($data['date_of_birth'] ?? '');

    if (strlen($name) < 2) jR(['success'=>false,'error'=>'Patient name required.'], 422);
    if (!$bg)              jR(['success'=>false,'error'=>'Blood group required.'], 422);

    /* Check for duplicate national_id */
    if ($natId) {
        $stmt = $conn->prepare("SELECT id FROM patient_registry WHERE national_id=? LIMIT 1");
        $stmt->bind_param('s', $natId); $stmt->execute();
        if ($stmt->get_result()->fetch_assoc()) {
            $stmt->close();
            jR(['success'=>false,'error'=>'Patient with this National ID already registered.'], 422);
        }
        $stmt->close();
    }

    $dobVal = (!empty($dob) && $dob !== '') ? $dob : null;
    $stmt = $conn->prepare("
        INSERT INTO patient_registry (national_id, full_name, blood_group, phone, address, date_of_birth)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param('ssssss', $natId, $name, $bg, $phone, $address, $dobVal);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Failed: '.$conn->error], 500);
    $newId = $conn->insert_id;
    $stmt->close();

    jR(['success'=>true, 'message'=>'Patient registered successfully!', 'patient_id'=>$newId]);
}

/* ══════════════════════════════════════════════
   #04 EXPIRY OFFERS
   Tables: expiry_alert + blood_bag + blood_request
   (NOT blood_bag directly — must go through expiry_alert)
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   BLOOD BANKS LIST (for dropdowns)
══════════════════════════════════════════════ */
function handleBloodBanks() {
    global $conn;
    requireHospital();
    /* Return ALL institution types: blood_bank, hospital, medical_college
       so the rating dropdown shows every partner institution */
    $res = $conn->query("
        SELECT id, name, city, rating_avg, role
        FROM blood_bank
        WHERE status = 'active'
          AND role IN ('blood_bank', 'hospital', 'medical_college')
        ORDER BY role ASC, name ASC
    ");
    $rows = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    /* Group by role for the frontend to render optgroups */
    $grouped = ['blood_bank'=>[], 'hospital'=>[], 'medical_college'=>[]];
    foreach ($rows as $r) {
        $grouped[$r['role']][] = $r;
    }
    jR(['success'=>true, 'banks'=>$rows, 'grouped'=>$grouped]);
}

/* ══════════════════════════════════════════════
   #08 RATE BLOOD BANK
   Tables: bank_review + blood_bank
══════════════════════════════════════════════ */
function handleRateBank() {
    global $conn;
    $bid  = requireHospital();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $bankId     = (int)($data['blood_bank_id'] ?? 0);
    $ratingInt  = (int)($data['rating']        ?? 0);
    $reviewText = trim($data['review_text']    ?? '');

    if (!$bankId)                      jR(['success'=>false,'error'=>'Blood bank required.'], 422);
    if ($ratingInt < 1 || $ratingInt > 5) jR(['success'=>false,'error'=>'Rating must be 1–5.'], 422);

    /* Upsert into bank_review */
    $stmt = $conn->prepare("SELECT id FROM bank_review WHERE blood_bank_id=? AND reviewer_user_id=? LIMIT 1");
    $stmt->bind_param('ii', $bankId, $bid);
    $stmt->execute();
    $existing   = $stmt->get_result()->fetch_assoc();
    $existingId = (int)($existing['id'] ?? 0);
    $stmt->close();

    if ($existingId) {
        $stmt = $conn->prepare("UPDATE bank_review SET rating=?, review_text=?, updated_at=NOW() WHERE id=?");
        $stmt->bind_param('isi', $ratingInt, $reviewText, $existingId);
    } else {
        $stmt = $conn->prepare("INSERT INTO bank_review (blood_bank_id, reviewer_user_id, rating, review_text) VALUES(?,?,?,?)");
        $stmt->bind_param('iiis', $bankId, $bid, $ratingInt, $reviewText);
    }
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Review failed: '.$conn->error], 500);
    $stmt->close();

    /* Update blood_bank.rating_avg — trigger for Gold Standard badge (feature #08) */
    $stmt = $conn->prepare("
        UPDATE blood_bank
        SET rating_avg = (SELECT AVG(rating) FROM bank_review WHERE blood_bank_id = ?)
        WHERE id = ?
    ");
    $stmt->bind_param('ii', $bankId, $bankId);
    $stmt->execute();
    $stmt->close();

    jR(['success'=>true, 'message'=>'Review submitted successfully!']);
}

/* ══════════════════════════════════════════════
   #08 MY REVIEWS
   Tables: bank_review + blood_bank
══════════════════════════════════════════════ */
function handleMyReviews() {
    global $conn;
    $bid = requireHospital();
    $stmt = $conn->prepare("
        SELECT br.id, br.rating, br.review_text, br.created_at, br.updated_at,
               bb.name AS bank_name, bb.city AS bank_city, bb.rating_avg
        FROM bank_review br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.reviewer_user_id = ?
        ORDER BY br.created_at DESC
    ");
    $stmt->bind_param('i', $bid);
    $stmt->execute();
    $reviews = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jR(['success'=>true, 'reviews'=>$reviews]);
}

/* ══════════════════════════════════════════════
   PROFILE
══════════════════════════════════════════════ */
function handleProfile() {
    global $conn;
    $bid = requireHospital();
    $stmt = $conn->prepare("SELECT id,name,registration_no,email,phone,city,address_line,created_at FROM blood_bank WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $bid);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$profile) jR(['success'=>false,'error'=>'Profile not found.'], 404);
    jR(['success'=>true, 'profile'=>$profile]);
}

/* ══════════════════════════════════════════════
   UPDATE PROFILE
══════════════════════════════════════════════ */
function handleUpdateProfile() {
    global $conn;
    $bid  = requireHospital();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $name    = trim($data['name']         ?? '');
    $email   = trim($data['email']        ?? '');
    $phone   = trim($data['phone']        ?? '');
    $city    = trim($data['city']         ?? '');
    $address = trim($data['address_line'] ?? '');

    $errors = [];
    if (strlen($name) < 2)                         $errors[] = 'Name required.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email required.';
    if (!empty($errors)) jR(['success'=>false,'errors'=>$errors], 422);

    $stmt = $conn->prepare("UPDATE blood_bank SET name=?,email=?,phone=?,city=?,address_line=?,updated_at=NOW() WHERE id=?");
    $stmt->bind_param('sssssi', $name, $email, $phone, $city, $address, $bid);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Update failed: '.$conn->error], 500);
    $stmt->close();
    jR(['success'=>true, 'message'=>'Profile updated successfully.']);
}

/* ============================================================
   ADMIN WARNING HANDLERS — hosp
   ============================================================ */
/* ══════════════════════════════════════════════
   TRACK REQUEST — view timeline for a submitted request
══════════════════════════════════════════════ */
function handleTrackRequestHosp() {
    global $conn;
    $hospId = requireHospital();
    $id     = (int)($_GET['id'] ?? 0);

    if (!$id) jR(['success' => false, 'error' => 'Request ID required.'], 422);

    $stmt = $conn->prepare("
        SELECT br.*, bb.name AS blood_bank_name
        FROM blood_request br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.id = ? AND br.requester_user_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('ii', $id, $hospId);
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

function _twE_hosp($t){global $conn;$r=$conn->query("SHOW TABLES LIKE '".$conn->real_escape_string($t)."'");return $r&&$r->num_rows>0;}
function _cwE_hosp($t,$c){global $conn;$r=$conn->query("SHOW COLUMNS FROM `".str_replace('`','',$t)."` LIKE '".$conn->real_escape_string($c)."'");return $r&&$r->num_rows>0;}

function handleGetWarnings_hosp(){
    global $conn; $uid=requireHospital();
    if(!_twE_hosp('admin_warning')) jR(['success'=>true,'warnings'=>[],'warning_count'=>0]);
    $d=_cwE_hosp('admin_warning','is_dismissed')?"AND (is_dismissed=0 OR is_dismissed IS NULL)":"";
    $s=$conn->prepare("SELECT id,message,status,sent_at,response,responded_at FROM admin_warning WHERE target_type='blood_bank' AND target_id=? $d ORDER BY sent_at DESC");
    if(!$s) jR(['success'=>false,'error'=>$conn->error],500);
    $s->bind_param('i',$uid);$s->execute();$w=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    jR(['success'=>true,'warnings'=>$w,'warning_count'=>count($w)]);
}

function handleAcknowledgeWarning_hosp(){
    global $conn; $uid=requireHospital();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_hosp('admin_warning','is_dismissed')){
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=?,is_dismissed=1,action_taken='acknowledged' WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Warning acknowledged.']);
}

function handleSubmitImprovement_hosp(){
    global $conn; $uid=requireHospital();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$plan=trim($data['plan']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($plan)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_hosp('admin_warning','improvement_plan')){
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=?,is_dismissed=1,action_taken='improvement_submitted',improvement_plan=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$plan,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Improvement plan submitted.']);
}

function handleAppealWarning_hosp(){
    global $conn; $uid=requireHospital();
    $data=json_decode(file_get_contents('php://input'),true)??$_POST;
    $wid=(int)($data['warning_id']??0);$reason=trim($data['reason']??'');
    if(!$wid) jR(['success'=>false,'error'=>'warning_id required.'],422);
    if(strlen($reason)<10) jR(['success'=>false,'error'=>'Min 10 characters required.'],422);
    $now=date('Y-m-d H:i:s');
    if(_cwE_hosp('admin_warning','appeal_reason')){
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=?,is_dismissed=1,action_taken='appealed',appeal_reason=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('ssii',$now,$reason,$wid,$uid);
    }else{
        $s=$conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=? WHERE id=? AND target_type='blood_bank' AND target_id=?");
        $s->bind_param('sii',$now,$wid,$uid);
    }
    $s->execute();$s->close();
    jR(['success'=>true,'message'=>'Appeal submitted.']);
}

/* ── INVENTORY (mirrors bank) ── */
function handleInventoryHosp() {
    global $conn;
    $hospId = requireHospital();
    $bid = $hospId; // blood_bank.id

    $type   = trim($_GET['type'] ?? '');
    $status = trim($_GET['status'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;

    $where  = ["bg.blood_bank_id = ?"];
    $types  = 'i';
    $params = [$bid];

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
    if ($stmt) { $stmt->bind_param('i', $bid); $stmt->execute(); $byGroup = $stmt->get_result()->fetch_all(MYSQLI_ASSOC); $stmt->close(); }

    $totals = [
        'total'       => (int)($conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bid")->fetch_assoc()['c'] ?? 0),
        'expiring7'   => (int)($conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bid AND expiry_date >= CURDATE() AND DATEDIFF(expiry_date, CURDATE()) <= 7")->fetch_assoc()['c'] ?? 0),
        'quarantined' => (int)($conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bid AND status = 'quarantined'")->fetch_assoc()['c'] ?? 0),
        'available'   => (int)($conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = $bid AND status = 'available'")->fetch_assoc()['c'] ?? 0)
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

function handleAddBagHosp() {
    global $conn;
    $bid = requireHospital();
    $data = reqBodyHosp();

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
        $stmt->bind_param('si', $likeName, $bid);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $donationId = $result ? (int)$result['id'] : null;
        $stmt->close();
    }

    $stmt = $conn->prepare("INSERT INTO blood_bag (blood_bank_id, bag_barcode, blood_group, donation_id, volume_ml, collection_date, expiry_date, status, storage_location, culture_test_status) VALUES (?, ?, ?, ?, 450, CURDATE(), ?, 'available', ?, 'pending')");
    $stmt->bind_param('ississ', $bid, $barcode, $bloodGroup, $donationId, $expiry, $storage);
    if (!$stmt->execute()) jR(['success' => false, 'error' => 'Failed to add bag: ' . $stmt->error], 500);
    $bagId = $conn->insert_id;
    $stmt->close();

    jR(['success' => true, 'message' => "Bag #$barcode added successfully.", 'bag_id' => $bagId]);
}

function handleAllocateBagHosp() {
    global $conn;
    $bid = requireHospital();
    $data = reqBodyHosp();
    $bagId = (int)($data['bag_id'] ?? 0);
    if (!$bagId) jR(['success' => false, 'error' => 'bag_id is required.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status = 'reserved' WHERE id = ? AND blood_bank_id = ? AND status = 'available'");
    $stmt->bind_param('ii', $bagId, $bid);
    if (!$stmt->execute() || $stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Bag not found or already allocated.'], 404);
    $stmt->close();

    jR(['success' => true, 'message' => 'Bag marked as reserved.']);
}

function handleDiscardBagHosp() {
    global $conn;
    $bid = requireHospital();
    $data = reqBodyHosp();
    $bagId = (int)($data['bag_id'] ?? 0);
    if (!$bagId) jR(['success' => false, 'error' => 'bag_id is required.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status = 'discarded' WHERE id = ? AND blood_bank_id = ? AND status IN ('available','quarantined')");
    $stmt->bind_param('ii', $bagId, $bid);
    if (!$stmt->execute() || $stmt->affected_rows < 1) jR(['success' => false, 'error' => 'Bag not found or cannot be discarded.'], 404);
    $stmt->close();

    jR(['success' => true, 'message' => 'Bag discarded.']);
}