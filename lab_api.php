<?php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

ob_start();

session_start();
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

function requireLabTech() {
    $uid     = $_SESSION['user_id']  ?? null;
    $role    = $_SESSION['role']     ?? null;
    $subRole = $_SESSION['sub_role'] ?? null;
    if ($uid !== null && is_numeric($uid) && $role === 'user' && $subRole === 'lab_technician') {
        return (int) $uid;
    }
    jR(['success'=>false,'error'=>'Unauthorised. Please log in.'], 401);
}

function fmtD($d) {
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('M j, Y', strtotime($d));
}

if (!$conn || $conn->connect_error) {
    jR(['success'=>false,'error'=>'Database connection failed.'], 500);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'dashboard':          handleDashboard();         break;
    case 'tests':              handleTests();             break;
    case 'donor_tests':        handleDonorTests();        break;
    case 'approve_donor_test': handleApproveDonorTest();  break;
    case 'reject_donor_test':  handleRejectDonorTest();   break;
    case 'submit_culture':     handleSubmitCulture();     break;
    case 'quarantine':         handleQuarantine();        break;
    case 'discard_bag':        handleDiscardBag();        break;
    case 'antibody':           handleAntibody();          break;
    case 'submit_antibody':    handleSubmitAntibody();    break;
    case 'coldchain':          handleColdChain();         break;
    case 'thalassemia':        handleThalassemia();       break;
    case 'flag_thalassemia':   handleFlagThalassemia();   break;
    case 'delete_thalassemia': handleDeleteThalassemia(); break;
    case 'health_check':       handleHealthCheck();       break;
    case 'profile':            handleProfile();           break;
    case 'update_profile':     handleUpdateProfile();     break;
    case 'keepalive':
        requireLabTech();
        jR(['success'=>true,'ts'=>time()]);
        break;
    default:
        jR(['success'=>false,'error'=>'Unknown action: '.htmlspecialchars($action)], 400);
}

function handleDashboard() {
    global $conn;
    $uid = requireLabTech();

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               bb.name AS blood_bank_name, bb.id AS blood_bank_id
        FROM users u
        LEFT JOIN blood_bank bb ON bb.id = u.blood_bank_id
        WHERE u.id = ? AND u.is_active = 1 LIMIT 1
    ");
    if (!$stmt) jR(['success'=>false,'error'=>'Query prepare failed: '.$conn->error], 500);
    $stmt->bind_param('i', $uid); $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$user) jR(['success'=>false,'error'=>'User not found.'], 404);

    $bankId = $user['blood_bank_id'];

    if ($bankId) {
        $stmt = $conn->prepare("
            SELECT COUNT(*) AS c FROM blood_bag
            WHERE blood_bank_id = ? AND culture_test_status = 'pending'
        ");
        $stmt->bind_param('i', $bankId); $stmt->execute();
        $pendingTests = (int)$stmt->get_result()->fetch_assoc()['c']; $stmt->close();

        $stmt = $conn->prepare("SELECT COUNT(*) AS c FROM blood_bag WHERE blood_bank_id = ? AND status = 'quarantined'");
        $stmt->bind_param('i', $bankId); $stmt->execute();
        $quarantinedBags = (int)$stmt->get_result()->fetch_assoc()['c']; $stmt->close();

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS c FROM blood_culture_test bct
            INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            WHERE bb.blood_bank_id = ?
              AND bct.result NOT IN ('negative','sterile')
              AND bct.result IS NOT NULL
              AND MONTH(bct.test_date) = MONTH(NOW())
              AND YEAR(bct.test_date)  = YEAR(NOW())
        ");
        $stmt->bind_param('i', $bankId); $stmt->execute();
        $failedCultures = (int)$stmt->get_result()->fetch_assoc()['c']; $stmt->close();

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS c FROM blood_culture_test bct
            INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            WHERE bb.blood_bank_id = ?
              AND MONTH(bct.test_date) = MONTH(NOW())
              AND YEAR(bct.test_date)  = YEAR(NOW())
        ");
        $stmt->bind_param('i', $bankId); $stmt->execute();
        $testsThisMonth = (int)$stmt->get_result()->fetch_assoc()['c']; $stmt->close();

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS c FROM blood_bag
            WHERE blood_bank_id = ?
              AND culture_test_status = 'pending'
              AND DATE(DATE_ADD(created_at, INTERVAL 2 DAY)) <= CURDATE()
        ");
        $stmt->bind_param('i', $bankId); $stmt->execute();
        $bagsDueToday = (int)$stmt->get_result()->fetch_assoc()['c']; $stmt->close();
    } else {
        $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE culture_test_status = 'pending'");
        $pendingTests = (int)($r ? $r->fetch_assoc()['c'] : 0);
        $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE status='quarantined'");
        $quarantinedBags = (int)($r ? $r->fetch_assoc()['c'] : 0);
        $r = $conn->query("SELECT COUNT(*) AS c FROM blood_culture_test WHERE result NOT IN ('negative','sterile') AND result IS NOT NULL AND MONTH(test_date)=MONTH(NOW()) AND YEAR(test_date)=YEAR(NOW())");
        $failedCultures = (int)($r ? $r->fetch_assoc()['c'] : 0);
        $r = $conn->query("SELECT COUNT(*) AS c FROM blood_culture_test WHERE MONTH(test_date)=MONTH(NOW()) AND YEAR(test_date)=YEAR(NOW())");
        $testsThisMonth = (int)($r ? $r->fetch_assoc()['c'] : 0);
        $r = $conn->query("SELECT COUNT(*) AS c FROM blood_bag WHERE culture_test_status = 'pending' AND DATE(DATE_ADD(created_at, INTERVAL 2 DAY)) <= CURDATE()");
        $bagsDueToday = (int)($r ? $r->fetch_assoc()['c'] : 0);
    }

    $critSql = "
        SELECT bct.id, bct.result, bct.pathogen_detected, bct.test_date,
               bb.id AS bag_id
        FROM blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        WHERE bct.result NOT IN ('negative','sterile')
          AND bct.result IS NOT NULL
          AND bct.pathogen_detected IS NOT NULL
    ";
    if ($bankId) $critSql .= " AND bb.blood_bank_id = " . (int)$bankId;
    $critSql .= " ORDER BY bct.test_date DESC LIMIT 1";
    $r = $conn->query($critSql);
    $criticalAlert = ($r && $r->num_rows > 0) ? $r->fetch_assoc() : null;

    $pendSql = "
        SELECT bb.id AS bag_id, bb.blood_group, bb.bag_barcode,
               bb.created_at AS test_date,
               DATE_ADD(bb.created_at, INTERVAL 2 DAY) AS due_date
        FROM blood_bag bb
        WHERE bb.culture_test_status = 'pending'
    ";
    if ($bankId) $pendSql .= " AND bb.blood_bank_id = " . (int)$bankId;
    $pendSql .= " ORDER BY bb.created_at ASC LIMIT 5";
    $r = $conn->query($pendSql);
    $recentPending = ($r) ? $r->fetch_all(MYSQLI_ASSOC) : [];

    $quarSql = "SELECT bb.id AS bag_id, bb.blood_group, bb.status, bb.quarantine_reason, bb.created_at FROM blood_bag bb WHERE bb.status = 'quarantined'";
    if ($bankId) $quarSql .= " AND bb.blood_bank_id = " . (int)$bankId;
    $quarSql .= " ORDER BY bb.created_at DESC LIMIT 5";
    $r = $conn->query($quarSql);
    $quarantinedList = ($r) ? $r->fetch_all(MYSQLI_ASSOC) : [];

    $ccSql = "SELECT tl.id, tl.sensor_id, tl.temperature_celsius, tl.recorded_at, tl.is_alert FROM temperature_log tl";
    if ($bankId) $ccSql .= " WHERE tl.blood_bank_id = " . (int)$bankId;
    $ccSql .= " ORDER BY tl.recorded_at DESC LIMIT 4";
    $r = $conn->query($ccSql);
    $coldChainPreview = ($r) ? $r->fetch_all(MYSQLI_ASSOC) : [];

    jR([
        'success' => true,
        'user' => [
            'id'              => (int)$user['id'],
            'full_name'       => $user['full_name'],
            'email'           => $user['email'],
            'phone'           => $user['phone'] ?? '',
            'blood_bank_name' => $user['blood_bank_name'] ?? 'BloodBridge Lab',
            'blood_bank_id'   => $user['blood_bank_id'],
            'member_since'    => date('M Y', strtotime($user['created_at'])),
        ],
        'stats' => [
            'pending_tests'    => $pendingTests,
            'quarantined_bags' => $quarantinedBags,
            'failed_cultures'  => $failedCultures,
            'tests_this_month' => $testsThisMonth,
            'bags_due_today'   => $bagsDueToday,
        ],
        'critical_alert'     => $criticalAlert,
        'recent_pending'     => $recentPending,
        'quarantined_list'   => $quarantinedList,
        'cold_chain_preview' => $coldChainPreview,
    ]);
}

function handleTests() {
    global $conn;
    $uid    = requireLabTech();
    $status = $_GET['status'] ?? 'pending';

    $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $bankId = $stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? null; $stmt->close();

    /* ── Blood Culture Tests ──────────────────────────────────────────────
       Start from blood_bag so bags that have NO culture_test row yet also
       appear as pending. LEFT JOIN to blood_culture_test to pick up any
       existing result; filter on the bag-level culture_test_status column.
       Note: donation_id can be NULL for manually added bags — include all.
    ── */
    $conditions = ["bb.status NOT IN ('discarded','used')"];
    if ($bankId) $conditions[] = "bb.blood_bank_id = " . (int)$bankId;

    if ($status === 'pending') {
        $conditions[] = "bb.culture_test_status = 'pending'";
    } elseif ($status === 'approved') {
        $conditions[] = "bb.culture_test_status IN ('negative','sterile','approved')";
    }
    /* status = 'all' → no extra filter, show everything */

    $where = "WHERE " . implode(' AND ', $conditions);

    $sql = "
        SELECT bb.id          AS bag_id,
               bb.bag_barcode,
               bb.blood_group,
               bb.culture_test_status,
               bct.id         AS test_id,
               bct.result,
               bct.pathogen_detected,
               bct.comments,
               bct.test_date,
               u.full_name    AS technician_name
        FROM blood_bag bb
        LEFT JOIN blood_culture_test bct ON bct.blood_bag_id = bb.id
        LEFT JOIN users u ON u.id = bct.lab_technician_id
        $where
        ORDER BY bb.created_at ASC
    ";

    $res   = $conn->query($sql);
    $tests = ($res) ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'tests'=>$tests]);
}

function handleSubmitCulture() {
    global $conn;
    $uid  = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $bagId    = (int)($data['bag_id']           ?? 0);
    $result   = trim($data['result']            ?? '');
    $pathogen = trim($data['pathogen_detected'] ?? '');
    $comments = trim($data['comments']          ?? '');

    if (!$bagId)  jR(['success'=>false,'error'=>'Bag ID required.'],    422);
    if (!$result) jR(['success'=>false,'error'=>'Result is required.'], 422);

    $stmt = $conn->prepare("SELECT id FROM blood_culture_test WHERE blood_bag_id = ? LIMIT 1");
    $stmt->bind_param('i', $bagId); $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc(); $stmt->close();

    if ($existing) {
        $stmt = $conn->prepare("UPDATE blood_culture_test SET result=?, pathogen_detected=?, comments=?, lab_technician_id=?, test_date=NOW() WHERE blood_bag_id=?");
        $stmt->bind_param('sssii', $result, $pathogen, $comments, $uid, $bagId);
    } else {
        $stmt = $conn->prepare("INSERT INTO blood_culture_test (blood_bag_id, result, pathogen_detected, comments, lab_technician_id, test_date) VALUES (?,?,?,?,?,NOW())");
        $stmt->bind_param('isssi', $bagId, $result, $pathogen, $comments, $uid);
    }
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Failed to save: '.$conn->error], 500);
    $stmt->close();

    if ($result !== 'negative' && $result !== 'sterile' && !empty($pathogen)) {
        $reason = "Culture test: $pathogen detected";
        $stmt = $conn->prepare("UPDATE blood_bag SET status='quarantined', quarantine_reason=? WHERE id=?");
        $stmt->bind_param('si', $reason, $bagId); $stmt->execute(); $stmt->close();
        jR(['success'=>true,'message'=>"Result saved. Bag #$bagId quarantined.",'quarantined'=>true]);
    }

    jR(['success'=>true,'message'=>"Result saved. Bag #$bagId cleared.",'quarantined'=>false]);
}

function handleQuarantine() {
    global $conn;
    $uid = requireLabTech();

    $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $bankId = $stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? null; $stmt->close();

    $sql = "SELECT bb.id AS bag_id, bb.blood_group, bb.status, bb.quarantine_reason, bb.created_at, bb.expiry_date FROM blood_bag bb WHERE bb.status = 'quarantined'";
    if ($bankId) $sql .= " AND bb.blood_bank_id = " . (int)$bankId;
    $sql .= " ORDER BY bb.created_at DESC";

    $res  = $conn->query($sql);
    $bags = ($res) ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'bags'=>$bags]);
}

function handleDiscardBag() {
    global $conn;
    $uid  = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $bagId = (int)($data['bag_id'] ?? 0);
    if (!$bagId) jR(['success'=>false,'error'=>'Bag ID required.'], 422);

    $stmt = $conn->prepare("UPDATE blood_bag SET status='discarded' WHERE id=?");
    $stmt->bind_param('i', $bagId); $stmt->execute(); $stmt->close();
    jR(['success'=>true,'message'=>"Bag #$bagId discarded successfully."]);
}

function handleAntibody() {
    global $conn;
    requireLabTech();

    $res = $conn->query("
        SELECT ap.id, ap.antibody_name, ap.is_donor, ap.detected_at,
               u.full_name AS person_name,
               dr.blood_group AS recipient_bg
        FROM antibody_profile ap
        LEFT JOIN users u ON u.id = ap.user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = ap.user_id
        ORDER BY ap.detected_at DESC
    ");
    $records = ($res) ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'records'=>$records]);
}

function handleSubmitAntibody() {
    global $conn;
    requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $userId       = (int)($data['user_id']      ?? 0);
    $antibodyName = trim($data['antibody_name'] ?? '');
    $isDonor      = (int)($data['is_donor']     ?? 0);

    if (!$userId)       jR(['success'=>false,'error'=>'User ID required.'],      422);
    if (!$antibodyName) jR(['success'=>false,'error'=>'Antibody name required.'],422);

    $stmt = $conn->prepare("INSERT INTO antibody_profile (user_id, antibody_name, is_donor, detected_at) VALUES (?,?,?,NOW())");
    $stmt->bind_param('isi', $userId, $antibodyName, $isDonor);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Failed to save: '.$conn->error], 500);
    $stmt->close();
    jR(['success'=>true,'message'=>'Antibody record saved.']);
}

function handleColdChain() {
    global $conn;
    $uid = requireLabTech();

    $stmt = $conn->prepare("SELECT blood_bank_id FROM users WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $bankId = $stmt->get_result()->fetch_assoc()['blood_bank_id'] ?? null; $stmt->close();

    $whereBank = $bankId ? " WHERE tl.blood_bank_id = " . (int)$bankId : '';
    $whereAlert= $bankId ? " WHERE blood_bank_id = "   . (int)$bankId . " AND is_alert=1" : " WHERE is_alert=1";

    $r = $conn->query("SELECT COUNT(*) AS c FROM temperature_log tl" . $whereBank);
    $total = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(*) AS c FROM temperature_log" . $whereAlert);
    $alerts = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $r = $conn->query("SELECT COUNT(DISTINCT blood_bank_id) AS c FROM temperature_log WHERE is_alert=1");
    $banksAffected = (int)($r ? $r->fetch_assoc()['c'] : 0);

    $sql = "SELECT tl.id, tl.sensor_id, tl.temperature_celsius, tl.recorded_at, tl.is_alert, bb.name AS bank_name FROM temperature_log tl LEFT JOIN blood_bank bb ON bb.id = tl.blood_bank_id" . $whereBank . " ORDER BY tl.recorded_at DESC LIMIT 200";
    $res  = $conn->query($sql);
    $logs = ($res) ? $res->fetch_all(MYSQLI_ASSOC) : [];

    jR(['success'=>true,'total'=>$total,'alerts'=>$alerts,'banks_affected'=>$banksAffected,'logs'=>$logs]);
}

function handleThalassemia() {
    global $conn;
    requireLabTech();

    $res = $conn->query("
        SELECT tc.id, CAST(tc.is_carrier AS UNSIGNED) AS is_carrier, tc.confirmed_at,
               u.full_name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
               dr.blood_group,
               uc.full_name AS confirmed_by_name
        FROM thalassemia_carrier tc
        LEFT JOIN users u  ON u.id  = tc.user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = tc.user_id
        LEFT JOIN users uc ON uc.id = tc.confirmed_by
        ORDER BY tc.confirmed_at DESC
    ");
    $carriers = ($res) ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'carriers'=>$carriers]);
}

function handleFlagThalassemia() {
    global $conn;
    $uid  = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $userEmail = trim($data['user_email'] ?? '');
    $isCarrier = (int)($data['is_carrier'] ?? 1);
    if (!$userEmail) jR(['success'=>false,'error'=>'User email required.'], 422);

    $stmt = $conn->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
    $stmt->bind_param('s', $userEmail); $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$user) jR(['success'=>false,'error'=>'No account found with that email.'], 404);
    $userId = (int)$user['id'];

    $stmt = $conn->prepare("SELECT id FROM thalassemia_carrier WHERE user_id=? LIMIT 1");
    $stmt->bind_param('i', $userId); $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc(); $stmt->close();

    if ($existing) {
        $stmt = $conn->prepare("UPDATE thalassemia_carrier SET is_carrier=?, confirmed_by=?, confirmed_at=NOW() WHERE user_id=?");
        $stmt->bind_param('iii', $isCarrier, $uid, $userId);
    } else {
        $stmt = $conn->prepare("INSERT INTO thalassemia_carrier (user_id, is_carrier, confirmed_by, confirmed_at) VALUES (?,?,?,NOW())");
        $stmt->bind_param('iii', $userId, $isCarrier, $uid);
    }
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Failed: '.$conn->error], 500);
    $stmt->close();

    // Auto-check couple alert for this user AND their partner
    syncThalassemiaCoupleAlert($userId);
    $stmt = $conn->prepare("SELECT CASE WHEN user_id_1 = ? THEN user_id_2 ELSE user_id_1 END AS pid FROM partner_links WHERE status='active' AND (? IN (user_id_1,user_id_2)) LIMIT 1");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($p) syncThalassemiaCoupleAlert((int)$p['pid']);

    jR(['success'=>true,'message'=>'Thalassemia status updated.']);
}

function handleDeleteThalassemia() {
    global $conn;
    requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;
    $id = (int)($data['carrier_id'] ?? 0);
    if (!$id) jR(['success'=>false,'error'=>'Carrier ID required.'], 422);

    $stmt = $conn->prepare("SELECT user_id FROM thalassemia_carrier WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $rec = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$rec) jR(['success'=>false,'error'=>'Record not found.'], 404);

    $userId = (int)$rec['user_id'];
    $stmt = $conn->prepare("DELETE FROM thalassemia_carrier WHERE id=?");
    $stmt->bind_param('i', $id);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Delete failed: '.$conn->error], 500);
    $stmt->close();

    syncThalassemiaCoupleAlert($userId);
    $stmt = $conn->prepare("SELECT CASE WHEN user_id_1=? THEN user_id_2 ELSE user_id_1 END AS pid FROM partner_links WHERE status='active' AND (? IN (user_id_1,user_id_2)) LIMIT 1");
    $stmt->bind_param('ii', $userId, $userId);
    $stmt->execute();
    $p = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($p) syncThalassemiaCoupleAlert((int)$p['pid']);

    jR(['success'=>true,'message'=>'Thalassemia record deleted.']);
}

function handleHealthCheck() {
    global $conn;
    $uid  = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $donorUserId = (int)($data['donor_user_id']      ?? 0);
    $haemoglobin = (float)($data['haemoglobin']      ?? 0);
    $bpSys       = (int)($data['blood_pressure_sys'] ?? 0);
    $bpDia       = (int)($data['blood_pressure_dia'] ?? 0);
    $pulse       = (int)($data['pulse']              ?? 0);
    $weightKg    = (float)($data['weight_kg']        ?? 0);
    $temp        = (float)($data['temperature']      ?? 0);
    $notes       = trim($data['notes']               ?? '');

    if (!$donorUserId) jR(['success'=>false,'error'=>'Donor user ID required.'], 422);

    $stmt = $conn->prepare("
        INSERT INTO donor_health_record
            (donor_user_id, haemoglobin, blood_pressure_sys, blood_pressure_dia,
             pulse, weight_kg, temperature, notes, recorded_at)
        VALUES (?,?,?,?,?,?,?,?,NOW())
    ");
    $stmt->bind_param('idiiidds', $donorUserId, $haemoglobin, $bpSys, $bpDia, $pulse, $weightKg, $temp, $notes);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Failed: '.$conn->error], 500);
    $stmt->close();
    jR(['success'=>true,'message'=>'Health check recorded.']);
}

function handleProfile() {
    global $conn;
    $uid = requireLabTech();

    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               bb.name AS blood_bank_name
        FROM users u
        LEFT JOIN blood_bank bb ON bb.id = u.blood_bank_id
        WHERE u.id = ? LIMIT 1
    ");
    $stmt->bind_param('i', $uid); $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc(); $stmt->close();
    if (!$profile) jR(['success'=>false,'error'=>'Profile not found.'], 404);
    jR(['success'=>true,'profile'=>$profile]);
}

function handleUpdateProfile() {
    global $conn;
    $uid  = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $fullName = trim($data['full_name'] ?? '');
    $email    = trim($data['email']     ?? '');
    $phone    = trim($data['phone']     ?? '');

    $errors = [];
    if (strlen($fullName) < 2) $errors[] = 'Name must be at least 2 characters.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Valid email required.';
    if (!empty($errors)) jR(['success'=>false,'errors'=>$errors], 422);

    $stmt = $conn->prepare("UPDATE users SET full_name=?, email=?, phone=?, updated_at=NOW() WHERE id=?");
    $stmt->bind_param('sssi', $fullName, $email, $phone, $uid);
    if (!$stmt->execute()) jR(['success'=>false,'error'=>'Update failed: '.$conn->error], 500);
    $stmt->close();
    jR(['success'=>true,'message'=>'Profile updated.']);
}
/* ================================================================
   DONOR TESTS - lab tech sees pending donor acceptances
================================================================ */
function handleDonorTests() {
    global $conn;
    requireLabTech();
    $status = $_GET['status'] ?? 'pending';
    $statusSql = ($status === 'pending') ? "AND bct.status='pending'" : (($status === 'approved') ? "AND bct.status='approved'" : "AND bct.status='rejected'");

    /* Check columns exist */
    $cols = [];
    $cr = $conn->query('SHOW COLUMNS FROM blood_culture_test');
    if ($cr) { while ($c = $cr->fetch_assoc()) $cols[] = $c['Field']; }
    if (!in_array('donor_user_id', $cols)) { jR(['success'=>true,'tests'=>[]]); return; }

    $sql = "SELECT bct.id AS test_id, bct.status AS culture_status, bct.created_at,
        bct.result, bct.comments, bct.donor_user_id,
        u.full_name AS donor_name, u.email AS donor_email,
        dr.blood_group AS donor_blood_group,
        br.id AS request_id, br.blood_group AS requested_blood_group,
        br.units_required, br.urgency,
        ru.full_name AS requester_name, ru.email AS requester_email
        FROM blood_culture_test bct
        INNER JOIN users u ON u.id = bct.donor_user_id
        LEFT JOIN donor_recipient dr ON dr.user_id = bct.donor_user_id
        LEFT JOIN blood_request br ON br.id = bct.request_id
        LEFT JOIN users ru ON ru.id = br.requester_user_id
        WHERE bct.donor_user_id IS NOT NULL $statusSql
        ORDER BY bct.created_at DESC";

    $res = $conn->query($sql);
    $tests = $res ? $res->fetch_all(MYSQLI_ASSOC) : [];
    jR(['success'=>true,'tests'=>$tests]);
}

/* ================================================================
   APPROVE DONOR TEST - creates blood bag with correct columns
================================================================ */
function handleApproveDonorTest() {
    global $conn;
    $uid = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $testId = (int)($data['test_id'] ?? 0);
    $comments = trim($data['comments'] ?? 'Approved by lab technician.');
    if (!$testId) jR(['success'=>false,'error'=>'test_id required.'], 422);

    /* Get test + blood group + bank */
    $row = $conn->query("
        SELECT bct.id, bct.donor_user_id, bct.request_id,
               dr.blood_group,
               br.blood_bank_id, br.requester_user_id
        FROM blood_culture_test bct
        LEFT JOIN donor_recipient dr ON dr.user_id = bct.donor_user_id
        LEFT JOIN blood_request br   ON br.id = bct.request_id
        WHERE bct.id = $testId AND bct.status = 'pending' LIMIT 1
    ");
    if (!$row || !($test = $row->fetch_assoc()))
        jR(['success'=>false,'error'=>'Test not found or already processed.'], 404);

    $bg      = $conn->real_escape_string($test['blood_group'] ?? 'O+');
    $bankId  = $test['blood_bank_id'] ? (int)$test['blood_bank_id'] : 'NULL';
    $barcode = strtoupper('BB' . date('YmdHis') . rand(100,999));
    $expiry  = date('Y-m-d', strtotime('+42 days'));

    /* Insert blood bag using actual column names */
    $bagSql = "INSERT INTO blood_bag
        (blood_bank_id, bag_barcode, blood_group, volume_ml, expiry_date, status, culture_test_status, created_at)
        VALUES ($bankId, '$barcode', '$bg', 450, '$expiry', 'available', 'negative', NOW())";

    if (!$conn->query($bagSql))
        jR(['success'=>false,'error'=>'Could not create blood bag: '.$conn->error], 500);
    $bagId = $conn->insert_id;

    /* Update culture test */
    $cm = $conn->real_escape_string($comments);
    $conn->query("UPDATE blood_culture_test SET status='approved', blood_bag_id=$bagId,
        lab_technician_id=$uid, result='negative', comments='$cm', test_date=NOW()
        WHERE id=$testId");

    /* Notify requester */
    if ($test['request_id'] && $test['requester_user_id']) {
        $rid   = (int)$test['requester_user_id'];
        $reqNo = str_pad($test['request_id'], 4, '0', STR_PAD_LEFT);
        $conn->query("INSERT INTO notification (user_id,title,message)
            VALUES ($rid,'Blood Bag Ready','A blood bag has been approved for your request #REQ-$reqNo. Barcode: $barcode')");
    }

    /* Notify donor */
    if ($test['donor_user_id']) {
        $did = (int)$test['donor_user_id'];
        $conn->query("INSERT INTO notification (user_id,title,message)
            VALUES ($did,'Donation Verified','Your blood donation has been verified. Blood bag created. Thank you!')");
    }

    jR(['success'=>true,'message'=>'Test approved. Blood bag #'.$bagId.' (Barcode: '.$barcode.') created.','bag_id'=>$bagId,'barcode'=>$barcode]);
}

/* ================================================================
   REJECT DONOR TEST
================================================================ */
function handleRejectDonorTest() {
    global $conn;
    $uid = requireLabTech();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $testId   = (int)($data['test_id']  ?? 0);
    $comments = $conn->real_escape_string(trim($data['comments'] ?? 'Rejected by lab technician.'));
    if (!$testId) jR(['success'=>false,'error'=>'test_id required.'], 422);

    $conn->query("UPDATE blood_culture_test
        SET status='rejected', lab_technician_id=$uid, result='rejected', comments='$comments', test_date=NOW()
        WHERE id=$testId AND status='pending'");

    $row = $conn->query("SELECT donor_user_id FROM blood_culture_test WHERE id=$testId");
    if ($row && ($r = $row->fetch_assoc()) && $r['donor_user_id']) {
        $did = (int)$r['donor_user_id'];
        $conn->query("INSERT INTO notification (user_id,title,message)
            VALUES ($did,'Donation Not Accepted','Unfortunately your blood sample did not pass the culture test.')");
    }
    jR(['success'=>true,'message'=>'Test rejected.']);
}