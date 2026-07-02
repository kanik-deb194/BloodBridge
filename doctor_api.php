<?php
session_start();
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

function jResp($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireDoctor() {
    $uid     = $_SESSION['user_id']  ?? null;
    $role    = $_SESSION['role']     ?? null;
    $subRole = $_SESSION['sub_role'] ?? null;
    if ($uid !== null && is_numeric($uid) && $role === 'user' && $subRole === 'doctor') {
        return (int) $uid;
    }
    jResp(['success'=>false,'error'=>'Unauthorised. Please log in.'], 401);
}

function fmtD($d) {
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('M j, Y', strtotime($d));
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'dashboard':          handleDashboard();         break;
    case 'patients':           handlePatients();          break;
    case 'antibodies':         handleAntibodies();        break;
    case 'match_suggestions':  handleMatchSuggestions();  break;
    case 'thalassemia':        handleThalassemia();       break;
    case 'transfusions':       handleTransfusions();      break;
    case 'approve_request':    handleApproveRequest();    break;
    case 'lab':                handleLab();               break;
    case 'pregnancy':          handlePregnancy();         break;
    case 'profile':            handleProfile();           break;
    case 'update_profile':     handleUpdateProfile();     break;
    case 'update_thal_status': handleUpdateThalStatus();  break;
    case 'add_patient':        handleAddPatient();        break;
    case 'mental_health':      handleMentalHealth();     break;
    case 'refer_psychologist': handleReferPsychologist();break;
    case 'crossmatch':         handleCrossmatch();       break;
    case 'authorize_crossmatch':handleAuthorizeCrossmatch();break;
    case 'record_outcome':     handleRecordOutcome();    break;
    case 'patient_requests':   handlePatientRequests();  break;
    default:
        jResp(['success'=>false,'error'=>'Unknown action: '.htmlspecialchars($action)], 400);
}

function handleDashboard() {
    global $conn;
    $uid = requireDoctor();

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.email, u.created_at,
               d.specialization, d.license_no, d.hospital_affiliation
        FROM users u
        INNER JOIN doctor d ON d.user_id = u.id
        WHERE u.id = ? AND u.is_active = 1 LIMIT 1
    ");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $doc = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$doc) jResp(['success'=>false,'error'=>'Doctor record not found.'], 404);

    $r = $conn->query("SELECT COUNT(*) AS cnt FROM patient_registry"); 
    $patientCount = (int)($r ? $r->fetch_assoc()['cnt'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS cnt FROM blood_request WHERE status='pending'");
    $pendingTrans = (int)($r ? $r->fetch_assoc()['cnt'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS cnt FROM antibody_profile WHERE is_donor = 0");
    $antibodyAlerts = (int)($r ? $r->fetch_assoc()['cnt'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS cnt FROM thalassemia_couple_alert");
    $thalAlerts = (int)($r ? $r->fetch_assoc()['cnt'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS cnt FROM mental_health_flag WHERE psychologist_referred = 0");
    $mentalFlags = (int)($r ? $r->fetch_assoc()['cnt'] : 0);

    $res = $conn->query("
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at,
               u.full_name AS requester_name,
               GROUP_CONCAT(ap.antibody_name SEPARATOR ', ') AS antibodies
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        LEFT JOIN antibody_profile ap ON ap.user_id = br.requester_user_id AND ap.is_donor = 0
        WHERE br.status = 'pending'
        GROUP BY br.id
        ORDER BY FIELD(br.urgency,'emergency','urgent','normal'), br.requested_at ASC
        LIMIT 4
    ");
    $pendingRequests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT tca.id, tca.risk_percentage, tca.advice, tca.created_at,
               u1.full_name AS name1, u2.full_name AS name2
        FROM thalassemia_couple_alert tca
        LEFT JOIN users u1 ON u1.id = tca.user_id_1
        LEFT JOIN users u2 ON u2.id = tca.user_id_2
        ORDER BY tca.created_at DESC LIMIT 3
    ");
    $thalCouples = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT ap.antibody_name, ap.detected_at, ap.is_donor, ap.advice,
               u.full_name AS patient_name,
               dr.blood_group
        FROM antibody_profile ap
        LEFT JOIN users u ON u.id = ap.user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = ap.user_id
        WHERE ap.is_donor = 0
        ORDER BY ap.detected_at DESC LIMIT 3
    ");
    $antibodyList = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT bct.result, bct.pathogen_detected, bct.test_date,
               bb.id AS bag_id
        FROM blood_culture_test bct
        LEFT JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        ORDER BY bct.test_date DESC LIMIT 4
    ");
    $labResults = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jResp([
        'success' => true,
        'doctor'  => [
            'user_id'              => (int)$doc['id'],
            'doctor_id'            => 'DOC-' . str_pad($doc['id'], 4, '0', STR_PAD_LEFT),
            'full_name'            => $doc['full_name'],
            'email'                => $doc['email'],
            'specialization'       => $doc['specialization'] ?? 'General',
            'license_no'           => $doc['license_no'] ?? '',
            'hospital_affiliation' => $doc['hospital_affiliation'] ?? '',
            'member_since'         => date('M Y', strtotime($doc['created_at'])),
        ],
        'stats' => [
            'patient_count'    => $patientCount,
            'pending_trans'    => $pendingTrans,
            'antibody_alerts'  => $antibodyAlerts,
            'thal_alerts'      => $thalAlerts,
            'mental_flags'     => $mentalFlags,
        ],
        'pending_requests' => $pendingRequests,
        'thal_couples'     => $thalCouples,
        'antibody_alerts'  => $antibodyList,
        'lab_results'      => $labResults,
    ]);
}

function handlePatients() {
    global $conn;
    requireDoctor();
    $bg = $_GET['blood_group'] ?? 'all';

    $sql = "
        SELECT pr.id, pr.full_name, pr.blood_group, pr.phone,
               pr.last_blood_request, pr.created_at,
               GROUP_CONCAT(ap.antibody_name SEPARATOR ', ') AS antibodies
        FROM patient_registry pr
        LEFT JOIN users u ON u.phone = pr.phone OR u.full_name = pr.full_name
        LEFT JOIN antibody_profile ap ON ap.user_id = u.id AND ap.is_donor = 0
    ";
    if ($bg !== 'all') $sql .= " WHERE pr.blood_group = '" . $conn->real_escape_string($bg) . "'";
    $sql .= " GROUP BY pr.id ORDER BY pr.last_blood_request DESC, pr.created_at DESC";

    $res = $conn->query($sql);
    $patients = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'patients'=>$patients]);
}

function handleAntibodies() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT ap.id, ap.antibody_name, ap.is_donor, ap.detected_at,
               u.full_name AS patient_name,
               dr.blood_group
        FROM antibody_profile ap
        LEFT JOIN users u ON u.id = ap.user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = ap.user_id
        ORDER BY ap.detected_at DESC
    ");
    $antibodies = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'antibodies'=>$antibodies]);
}

function handleMatchSuggestions() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT ams.id, ams.compatibility_score, ams.reason, ams.was_accepted,
               ams.created_at,
               ur.full_name AS recipient_name,
               ud.full_name AS donor_name
        FROM antibody_match_suggestion ams
        LEFT JOIN users ur ON ur.id = ams.recipient_user_id
        LEFT JOIN users ud ON ud.id = ams.suggested_donor_user_id
        ORDER BY ams.created_at DESC LIMIT 20
    ");
    $suggestions = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'suggestions'=>$suggestions]);
}

function handleThalassemia() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT tc.id, tc.is_carrier, tc.confirmed_at,
               u.full_name AS patient_name,
               uc.full_name AS confirmed_by_name
        FROM thalassemia_carrier tc
        LEFT JOIN users u  ON u.id  = tc.user_id
        LEFT JOIN users uc ON uc.id = tc.confirmed_by
        ORDER BY tc.confirmed_at DESC
    ");
    $carriers = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT tca.id, tca.risk_percentage, tca.advice, tca.created_at,
               u1.full_name AS name1, u2.full_name AS name2
        FROM thalassemia_couple_alert tca
        LEFT JOIN users u1 ON u1.id = tca.user_id_1
        LEFT JOIN users u2 ON u2.id = tca.user_id_2
        ORDER BY tca.created_at DESC
    ");
    $couples = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jResp(['success'=>true, 'carriers'=>$carriers, 'couples'=>$couples]);
}

function handleUpdateThalStatus() {
    global $conn;
    $uid  = requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $tcId = (int)($data['thal_carrier_id'] ?? 0);
    $status = (int)($data['is_carrier'] ?? 1);
    if (!$tcId) jResp(['success'=>false,'error'=>'Carrier ID required.'], 422);

    // Get user_id before updating
    $stmt = $conn->prepare("SELECT user_id FROM thalassemia_carrier WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $tcId); $stmt->execute();
    $carrier = $stmt->get_result()->fetch_assoc(); $stmt->close();
    $userId = $carrier ? (int)$carrier['user_id'] : 0;

    $stmt = $conn->prepare("UPDATE thalassemia_carrier SET is_carrier=?, confirmed_by=?, confirmed_at=NOW() WHERE id=?");
    $stmt->bind_param('iii', $status, $uid, $tcId); $stmt->execute(); $stmt->close();

    // Auto-check couple alert for this user
    if ($userId) syncThalassemiaCoupleAlert($userId);

    jResp(['success'=>true, 'message'=>'Thalassemia status updated.']);
}

function handleTransfusions() {
    global $conn;
    requireDoctor();
    $status = $_GET['status'] ?? 'pending';

    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, br.notes,
               u.full_name AS requester_name,
               GROUP_CONCAT(ap.antibody_name SEPARATOR ', ') AS antibodies
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        LEFT JOIN antibody_profile ap ON ap.user_id = br.requester_user_id AND ap.is_donor = 0
    ";
    if ($status !== 'all') $sql .= " WHERE br.status = '" . $conn->real_escape_string($status) . "'";
    $sql .= " GROUP BY br.id ORDER BY FIELD(br.urgency,'emergency','urgent','normal'), br.requested_at ASC";

    $res  = $conn->query($sql);
    $reqs = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT t.id, t.issued_at, t.crossmatch_result, t.reaction_notes,
               ur.full_name AS recipient_name,
               br.blood_group, br.units_required,
               h.name AS hospital_name
        FROM transfusion t
        LEFT JOIN users ur       ON ur.id = t.recipient_user_id
        LEFT JOIN blood_request br ON br.id = t.request_id
        LEFT JOIN hospital h     ON h.id   = t.hospital_id
        ORDER BY t.issued_at DESC LIMIT 20
    ");
    $history = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jResp(['success'=>true, 'requests'=>$reqs, 'history'=>$history]);
}

function handleApproveRequest() {
    global $conn;
    $uid  = requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $reqId   = (int)($data['request_id'] ?? 0);
    $action  = $data['decision']  ?? 'approved';
    $comment = trim($data['comments'] ?? '');

    if (!$reqId) jResp(['success'=>false,'error'=>'Request ID required.'], 422);
    if (!in_array($action, ['approved','rejected'])) jResp(['success'=>false,'error'=>'Invalid decision.'], 422);

    if ($action === 'approved') {
        $stmt = $conn->prepare("UPDATE blood_request SET status='approved', approved_at=NOW() WHERE id=?");
    } else {
        $stmt = $conn->prepare("UPDATE blood_request SET status='rejected' WHERE id=?");
    }
    $stmt->bind_param('i', $reqId); $stmt->execute(); $stmt->close();

    $entityType = 'blood_request';
    $stmt = $conn->prepare("
        INSERT INTO approval_step (entity_id, entity_type, approver_user_id, step_order, status, comments)
        VALUES (?, ?, ?, 1, ?, ?)
    ");
    $stmt->bind_param('isiss', $reqId, $entityType, $uid, $action, $comment);
    $stmt->execute(); $stmt->close();

    jResp(['success'=>true, 'message'=>"Request {$action} successfully."]);
}

function handleLab() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT bct.id, bct.result, bct.pathogen_detected, bct.comments,
               bct.test_date,
               bb.id AS bag_id,
               u.full_name AS technician_name
        FROM blood_culture_test bct
        LEFT JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        LEFT JOIN users u      ON u.id  = bct.lab_technician_id
        ORDER BY bct.test_date DESC
    ");
    $cultures = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    $res = $conn->query("
        SELECT dhr.id, dhr.haemoglobin, dhr.weight_kg,
               dhr.blood_pressure_sys, dhr.blood_pressure_dia,
               dhr.pulse, dhr.temperature, dhr.notes, dhr.recorded_at,
               u.full_name AS donor_name
        FROM donor_health_record dhr
        LEFT JOIN users u ON u.id = dhr.donor_user_id
        ORDER BY dhr.recorded_at DESC LIMIT 30
    ");
    $healthRecords = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jResp(['success'=>true, 'cultures'=>$cultures, 'health_records'=>$healthRecords]);
}

function handlePregnancy() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT pr.id, pr.mother_blood_group, pr.father_blood_group,
               pr.expected_delivery_date, pr.predicted_baby_blood_group,
               pr.risk_advice, pr.recorded_at,
               u.full_name AS mother_name
        FROM pregnancy_record pr
        LEFT JOIN users u ON u.id = pr.mother_user_id
        ORDER BY pr.recorded_at DESC
    ");
    $records = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'records'=>$records]);
}

function handleProfile() {
    global $conn;
    $uid = requireDoctor();

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               d.specialization, d.license_no, d.hospital_affiliation
        FROM users u
        INNER JOIN doctor d ON d.user_id = u.id
        WHERE u.id = ? LIMIT 1
    ");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$profile) jResp(['success'=>false,'error'=>'Profile not found.'], 404);
    jResp(['success'=>true, 'profile'=>$profile]);
}

function handleUpdateProfile() {
    global $conn;
    $uid  = requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $fullName  = trim($data['full_name']           ?? '');
    $email     = trim($data['email']               ?? '');
    $phone     = trim($data['phone']               ?? '');
    $spec      = trim($data['specialization']      ?? '');
    $license   = trim($data['license_no']          ?? '');
    $hospital  = trim($data['hospital_affiliation']?? '');

    $errors = [];
    if (strlen($fullName) < 2) $errors[] = 'Name must be at least 2 characters.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email required.';
    if (!empty($errors)) jResp(['success'=>false,'errors'=>$errors], 422);

    $stmt = $conn->prepare("UPDATE users SET full_name=?,phone=?,email=?,updated_at=NOW() WHERE id=?");
    $stmt->bind_param('sssi', $fullName, $phone, $email, $uid); $stmt->execute(); $stmt->close();

    $stmt = $conn->prepare("UPDATE doctor SET specialization=?,license_no=?,hospital_affiliation=? WHERE user_id=?");
    $stmt->bind_param('sssi', $spec, $license, $hospital, $uid); $stmt->execute(); $stmt->close();

    jResp(['success'=>true, 'message'=>'Profile updated successfully.']);
}

function handleAddPatient() {
    global $conn;
    requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $name     = trim($data['full_name']   ?? '');
    $bg       = trim($data['blood_group'] ?? '');
    $phone    = trim($data['phone']       ?? '');
    $address  = trim($data['address']     ?? '');
    $natId    = trim($data['national_id'] ?? '');

    if (strlen($name) < 2) jResp(['success'=>false,'error'=>'Patient name required.'], 422);
    if (!$bg)              jResp(['success'=>false,'error'=>'Blood group required.'],  422);

    /* Check for duplicate — same national_id OR same phone+name combination */
    if ($natId) {
        $chk = $conn->prepare("SELECT id FROM patient_registry WHERE national_id = ? LIMIT 1");
        $chk->bind_param('s', $natId); $chk->execute();
        $existing = $chk->get_result()->fetch_assoc(); $chk->close();
        if ($existing) jResp(['success'=>false,'error'=>'A patient with this National ID already exists (ID #'.$existing['id'].').'], 409);
    } elseif ($phone) {
        $chk = $conn->prepare("SELECT id FROM patient_registry WHERE phone = ? AND full_name = ? LIMIT 1");
        $chk->bind_param('ss', $phone, $name); $chk->execute();
        $existing = $chk->get_result()->fetch_assoc(); $chk->close();
        if ($existing) jResp(['success'=>false,'error'=>'A patient with this name and phone number already exists (ID #'.$existing['id'].').'], 409);
    }

    $stmt = $conn->prepare("INSERT INTO patient_registry (national_id,full_name,blood_group,phone,address) VALUES(?,?,?,?,?)");
    $stmt->bind_param('sssss', $natId, $name, $bg, $phone, $address);
    if (!$stmt->execute()) jResp(['success'=>false,'error'=>'Failed to add patient: '.$conn->error], 500);
    $newId = $conn->insert_id; $stmt->close();

    jResp(['success'=>true, 'message'=>'Patient registered!', 'patient_id'=>$newId]);
}

function handleMentalHealth() {
    global $conn;
    requireDoctor();

    $res = $conn->query("
        SELECT mhf.id, mhf.flag_type, mhf.severity, mhf.keywords_found,
               mhf.psychologist_referred, mhf.resolved, mhf.created_at,
               u.full_name AS user_name, u.email AS user_email
        FROM mental_health_flag mhf
        LEFT JOIN users u ON u.id = mhf.user_id
        ORDER BY mhf.created_at DESC
    ");
    $flags = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'flags'=>$flags]);
}

function handleReferPsychologist() {
    global $conn;
    requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $flagId = (int)($data['flag_id'] ?? 0);
    if (!$flagId) jResp(['success'=>false,'error'=>'Flag ID required.'], 422);

    $stmt = $conn->prepare("UPDATE mental_health_flag SET psychologist_referred=1, resolved=1 WHERE id=?");
    $stmt->bind_param('i', $flagId); $stmt->execute(); $stmt->close();
    jResp(['success'=>true, 'message'=>'Psychologist referral submitted.']);
}

function handleCrossmatch() {
    global $conn;
    requireDoctor();
    $status = $_GET['status'] ?? 'pending';

    $sql = "
        SELECT ct.id, ct.blood_bag_id, ct.recipient_user_id,
               ct.major_crossmatch, ct.minor_crossmatch,
               ct.antibody_screen, ct.notes AS test_notes, ct.test_date,
               u.full_name AS recipient_name,
               bb.blood_group
        FROM crossmatch_test ct
        LEFT JOIN users u ON u.id = ct.recipient_user_id
        LEFT JOIN blood_bag bb ON bb.id = ct.blood_bag_id
    ";
    if ($status !== 'all') {
        $safe = $conn->real_escape_string($status);
        $sql .= " WHERE ct.major_crossmatch = '$safe' OR ct.minor_crossmatch = '$safe'";
    }
    $sql .= " ORDER BY ct.test_date DESC LIMIT 50";

    $res = $conn->query($sql);
    $tests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];

    foreach ($tests as &$t) {
        $t['authorized'] = ($t['major_crossmatch'] !== 'pending' && $t['minor_crossmatch'] !== 'pending');
    }
    unset($t);

    jResp(['success'=>true, 'tests'=>$tests]);
}

function handleAuthorizeCrossmatch() {
    global $conn;
    $uid  = requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $testId = (int)($data['test_id'] ?? 0);
    $major  = $data['major_crossmatch'] ?? 'compatible';
    $minor  = $data['minor_crossmatch'] ?? 'compatible';
    $ab     = trim($data['antibody_screen'] ?? '');
    $notes  = trim($data['notes'] ?? '');

    if (!$testId) jResp(['success'=>false,'error'=>'Test ID required.'], 422);
    if (!in_array($major, ['compatible','incompatible','pending'])) jResp(['success'=>false,'error'=>'Invalid major crossmatch value.'], 422);
    if (!in_array($minor, ['compatible','incompatible','pending'])) jResp(['success'=>false,'error'=>'Invalid minor crossmatch value.'], 422);

    $stmt = $conn->prepare("UPDATE crossmatch_test SET major_crossmatch=?, minor_crossmatch=?, antibody_screen=?, tested_by=?, notes=? WHERE id=?");
    $stmt->bind_param('sssssi', $major, $minor, $ab, $uid, $notes, $testId);
    $stmt->execute(); $stmt->close();

    jResp(['success'=>true, 'message'=>'Crossmatch test authorized.']);
}

function handleRecordOutcome() {
    global $conn;
    requireDoctor();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $transId   = (int)($data['transfusion_id'] ?? 0);
    $outcome   = $data['outcome'] ?? 'successful';
    $notes     = trim($data['reaction_notes'] ?? '');
    $xmatch    = trim($data['crossmatch_result'] ?? '');

    if (!$transId) jResp(['success'=>false,'error'=>'Transfusion ID required.'], 422);

    if ($outcome === 'successful') {
        $fullNotes = 'Outcome: Successful. ' . $notes;
    } elseif ($outcome === 'minor_reaction') {
        $fullNotes = 'Outcome: Minor Reaction. ' . $notes;
    } else {
        $fullNotes = 'Outcome: Major Reaction. ' . $notes;
    }

    if ($xmatch) {
        $stmt = $conn->prepare("UPDATE transfusion SET reaction_notes=?, crossmatch_result=? WHERE id=?");
        $stmt->bind_param('ssi', $fullNotes, $xmatch, $transId);
    } else {
        $stmt = $conn->prepare("UPDATE transfusion SET reaction_notes=? WHERE id=?");
        $stmt->bind_param('si', $fullNotes, $transId);
    }
    $stmt->execute(); $stmt->close();

    jResp(['success'=>true, 'message'=>'Transfusion outcome recorded.']);
}

function handlePatientRequests() {
    global $conn;
    requireDoctor();
    $patientId = (int)($_GET['patient_id'] ?? 0);
    if (!$patientId) jResp(['success'=>false,'error'=>'Patient ID required.'], 422);

    $res = $conn->query("
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, br.notes,
               u.full_name AS requester_name
        FROM blood_request br
        LEFT JOIN users u ON u.id = br.requester_user_id
        WHERE br.requester_user_id = (SELECT user_id FROM patient_registry WHERE id = $patientId)
           OR br.id IN (SELECT MAX(br2.id) FROM blood_request br2
                        LEFT JOIN patient_registry pr ON pr.phone IN (SELECT phone FROM users WHERE id = br2.requester_user_id)
                        WHERE pr.id = $patientId)
        ORDER BY br.requested_at DESC LIMIT 20
    ");
    $requests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jResp(['success'=>true, 'requests'=>$requests]);
}