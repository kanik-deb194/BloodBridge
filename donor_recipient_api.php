<?php
/* ============================================================
   BloodBridge — donor_recipient_api.php (UNIFIED v2)
   Single table: donor_recipient
   Role: donor_recipient
   ============================================================ */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/ai_functions.php';
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

/* ══════════════════════════════════════════════════════════
   Fixed reward milestones:
     10 donations → T-Shirt    (tier 0)
     20 donations → 10% Coupon (tier 1)
     40 donations → 25% Coupon (tier 2)
══════════════════════════════════════════════════════════ */

const REWARD_MILESTONES = [10, 20, 40];
const REWARD_TIERS     = [0, 1, 2];
const REWARD_TYPES     = ['tshirt', 'coupon_10', 'coupon_25'];
const REWARD_NAMES     = ['Premium T-Shirt', '10% Discount Coupon', '25% Discount Coupon'];
const REWARD_ICONS     = ['👕', '🎫', '🏆'];
const REWARD_DESCS     = [
    'Redeem an exclusive Blood Bridge premium t-shirt as a token of gratitude for your lifesaving contributions.',
    'Redeem a 10% discount coupon valid for medical tests at any partner hospital.',
    'Redeem a 25% discount coupon valid for medical tests at any partner hospital.',
];

function jsonResponse($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth()
{
    $uid     = $_SESSION['user_id']  ?? null;
    $role    = $_SESSION['role']     ?? null;
    $subRole = $_SESSION['sub_role'] ?? null;
    if ($uid !== null && is_numeric($uid) && ($role === 'user' && $subRole === 'donor_recipient')) {
        return (int) $uid;
    }
    jsonResponse(['success' => false, 'error' => 'Unauthorised. Please log in.'], 401);
}

function fmtDate($d)
{
    if (!$d || $d === '0000-00-00' || $d === '0000-00-00 00:00:00') return null;
    return date('M j, Y', strtotime($d));
}

define('COOLDOWN_DAYS', 30);

function getCooldownInfo($uid)
{
    global $conn;

    $info = [
        'in_cooldown'         => false,
        'remaining_days'      => 0,
        'remaining_seconds'   => 0,
        'cooldown_ends_at'    => null,
        'cooldown_progress'   => 100,
        'last_donation_date'  => null,
    ];

    // Use donation_promise.fulfilled_at (TIMESTAMP with exact time) as the reference
    $stmt = $conn->prepare("
        SELECT fulfilled_at
        FROM donation_promise
        WHERE donor_user_id = ? AND status = 'fulfilled' AND fulfilled_at IS NOT NULL
        ORDER BY fulfilled_at DESC
        LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        // Fallback: use last_donation_date from donor_recipient (date only)
        $stmt = $conn->prepare("SELECT last_donation_date FROM donor_recipient WHERE user_id = ? LIMIT 1");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row && !empty($row['last_donation_date']) && $row['last_donation_date'] !== '0000-00-00') {
            $dt = $row['last_donation_date'];
            $info['last_donation_date'] = $dt;
            if (COOLDOWN_DAYS > 0) {
                $end = new DateTime($dt);
                $end->modify('+' . COOLDOWN_DAYS . ' days');
                $end->setTime(23, 59, 59);
                $now = new DateTime();
                if ($now < $end) {
                    $raw = $end->format('Y-m-d\TH:i:s');
                    $info['cooldown_ends_at'] = $raw . date('P');
                    $diff = $now->diff($end);
                    $totalSeconds = $diff->days * 86400 + $diff->h * 3600 + $diff->i * 60 + $diff->s;
                    $totalCooldown = COOLDOWN_DAYS * 86400;
                    $elapsed = $totalCooldown - $totalSeconds;
                    $info['in_cooldown'] = true;
                    $info['remaining_days'] = (int)ceil($totalSeconds / 86400);
                    $info['remaining_seconds'] = $totalSeconds;
                    $info['cooldown_progress'] = round(($elapsed / $totalCooldown) * 100, 1);
                }
            }
        }
        return $info;
    }

    $fulfilledAt = $row['fulfilled_at'];
    // fulfilled_at is a MySQL TIMESTAMP, PHP reads it as string like "2026-05-21 09:15:30"
    $info['last_donation_date'] = $fulfilledAt;

    $info['in_cooldown'] = false;
    if (COOLDOWN_DAYS <= 0) return $info;

    $start = new DateTime($fulfilledAt);
    $end = clone $start;
    $end->modify('+' . COOLDOWN_DAYS . ' days');

    $now = new DateTime();
    if ($now < $end) {
        $diff = $now->diff($end);
        $totalSeconds = $diff->days * 86400 + $diff->h * 3600 + $diff->i * 60 + $diff->s;
        $totalCooldown = COOLDOWN_DAYS * 86400;
        $elapsed = $totalCooldown - $totalSeconds;
        $info['in_cooldown'] = true;
        $info['remaining_days'] = (int)ceil($totalSeconds / 86400);
        $info['remaining_seconds'] = $totalSeconds;
        $info['cooldown_progress'] = round(($elapsed / $totalCooldown) * 100, 1);
        // Include timezone offset so JS Date parses it in local time
        $info['cooldown_ends_at'] = $end->format('Y-m-d\TH:i:s') . date('P');
    }

    return $info;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'dashboard':
        handleDashboard();
        break;
    case 'donations':
        handleDonations();
        break;
    case 'certificate':
        handleCertificate();
        break;
    case 'health':
        handleHealth();
        break;
    case 'requests':
        handleRequests();
        break;
    case 'my_requests':
        handleMyRequests();
        break;
    case 'my_blood_bags':
        handleMyBloodBags();
        break;
    case 'accept_blood_bag':
        handleAcceptBloodBag();
        break;
    case 'accept_bank_offer':
        handleAcceptBankOffer();
        break;
    case 'profile':
        handleProfile();
        break;
    case 'update_profile':
        handleUpdateProfile();
        break;
    case 'notifications':
        handleNotifications();
        break;
    case 'save_promise':
        handleSavePromise();
        break;
    case 'respond_request':
        handleRespondRequest();
        break;
    case 'rate_bank':
        handleRateBank();
        break;
    case 'antibody':
        handleAntibody();
        break;
    case 'blood_banks':
        handleBloodBanks();
        break;
    case 'delivery':
        handleDelivery();
        break;
    case 'approvals':
        handleApprovals();
        break;
    case 'submit_request':
        handleSubmitRequest();
        break;
    case 'accept_request':
        handleAcceptRequest();
        break;
    case 'simulate_drone':
        handleSimulateDrone();
        break;
    case 'emergency_voice':
        handleEmergencyVoice();
        break;
    case 'emergency_requests':
        handleEmergencyRequests();
        break;
    case 'emergency_approve':
        handleEmergencyApprove();
        break;
    case 'emergency_ignore':
        handleEmergencyIgnore();
        break;
    case 'hospitals':
        handleHospitals();
        break;
    /* ── Notification Preferences (A.1.5) ── */
    case 'save_notification_preferences':
        handleSaveNotificationPreferences();
        break;
    /* ── Verify Request Hash (A.2.5) ── */
    case 'verify_request_hash':
        handleVerifyRequestHash();
        break;
    /* ── Request Timeline (A.2.6) ── */
    case 'request_timeline':
        handleRequestTimeline();
        break;
    /* ── Chatbot / Raktosathi (A.4) ── */
    case 'chatbot_message':
        handleChatbotMessage();
        break;
    /* ── Promise Self-Service (KANIK) ── */
    case 'reschedule_promise':
        handleReschedulePDR();
        break;
    case 'cancel_promise':
        handleCancelPromiseDR();
        break;
    /* ── Check Availability (KANIK) ── */
    case 'check_availability':
        handleCheckAvailability();
        break;
    case 'check_cooldown':
        jsonResponse(['success' => true, 'cooldown' => getCooldownInfo(requireAuth())]);
        break;
    /* ── Warning Handlers (KANIK) ── */
    case 'get_warnings':
        handleGetWarningsDR();
        break;
    case 'acknowledge_warning':
        handleAcknowledgeWarningDR();
        break;
    case 'submit_improvement':
        handleSubmitImprovementDR();
        break;
    case 'appeal_warning':
        handleAppealWarningDR();
        break;
    case 'my_voice_requests':
        handleMyVoiceRequests();
        break;
    /* ── Thalassemia Couple Alert / Partner Linking ── */
    case 'link_partner':
        handleLinkPartner();
        break;
    case 'partner_status':
        handlePartnerStatus();
        break;
    case 'confirm_partner':
        handleConfirmPartner();
        break;
    case 'unlink_partner':
        handleUnlinkPartner();
        break;
    /* ── Complete Donation — requester confirms donation completed ── */
    case 'complete_donation':
        handleCompleteDonation();
        break;
    /* ── Pay Donor — requester marks payment to a donor ── */
    case 'pay_donor':
        handlePayDonor();
        break;
    /* ── Donor Did Not Come — requester reports donor didn't show up ── */
    case 'donor_not_come':
        handleDonorNotCome();
        break;
    /* ── Rewards & Redemption ── */
    case 'rewards':
        handleRewards();
        break;
    case 'redeem_reward':
        handleRedeemReward();
        break;
    case 'debug_rewards':
        handleDebugRewards();
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function handleDashboard()
{
    global $conn;
    $uid = requireAuth();

    $stmt = $conn->prepare("SELECT id, full_name, email, phone, created_at FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$user) jsonResponse(['success' => false, 'error' => 'User not found.'], 404);

    $stmt = $conn->prepare("
        SELECT blood_group, date_of_birth, gender, weight_kg, height_cm,
               last_donation_date, total_donations, is_available, trust_score, family_legacy_id,
               emergency_contact, underlying_conditions
        FROM donor_recipient WHERE user_id = ? LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $dr = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    // Auto-create donor_recipient row if missing (backward compatibility)
    if (!$dr) {
        $stmt = $conn->prepare("
            INSERT INTO donor_recipient (user_id, blood_group, date_of_birth, gender, weight_kg, height_cm,
                last_donation_date, total_donations, is_available, trust_score, family_legacy_id,
                emergency_contact, underlying_conditions)
            VALUES (?, '', NULL, NULL, 60.00, 165.00, NULL, 0, 1, 100, NULL, '', '')
        ");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $stmt->close();

        // Re-fetch
        $stmt = $conn->prepare("
            SELECT blood_group, date_of_birth, gender, weight_kg, height_cm,
                   last_donation_date, total_donations, is_available, trust_score, family_legacy_id,
                   emergency_contact, underlying_conditions
            FROM donor_recipient WHERE user_id = ? LIMIT 1
        ");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $dr = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    /* Recompute total_donations from all donation tracking sources */
    $dp = $conn->query("SELECT COUNT(*) AS cnt FROM donation_promise WHERE donor_user_id = $uid AND status = 'fulfilled'");
    $dn = $conn->query("SELECT COUNT(*) AS cnt FROM donation WHERE donor_user_id = $uid AND status = 'completed'");
    $actual = max(
        $dp ? (int)$dp->fetch_assoc()['cnt'] : 0,
        $dn ? (int)$dn->fetch_assoc()['cnt'] : 0
    );
    $conn->query("UPDATE donor_recipient SET total_donations = $actual WHERE user_id = $uid");
    $dr['total_donations'] = $actual;

    $bloodGroup = $dr['blood_group'] ?? '';
    $nextEligible = null;
    if (!empty($dr['last_donation_date']) && $dr['last_donation_date'] !== '0000-00-00') {
        $next = new DateTime($dr['last_donation_date']);
        $next->modify('+' . COOLDOWN_DAYS . ' days');
        $nextEligible = $next->format('M j, Y');
    }

    $stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM blood_request WHERE requester_user_id = ? AND status IN ('pending','approved','in_transit')");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $activeCount = (int)$stmt->get_result()->fetch_assoc()['cnt'];
    $stmt->close();

    $stmt = $conn->prepare("SELECT id, status FROM blood_request WHERE requester_user_id = ? ORDER BY requested_at DESC LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $lastReq = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT dp.id, dp.promise_time AS donation_date, dp.status, dp.confirmation_code,
               bb.name AS blood_bank_name, bb.city
        FROM donation_promise dp
        LEFT JOIN blood_bank bb ON bb.id = dp.blood_bank_id
        WHERE dp.donor_user_id = ?
        ORDER BY dp.promise_time DESC LIMIT 4
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $recentDonations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT br.id, br.blood_group, br.units_required, br.units_fulfilled, br.urgency, br.blood_component,
               br.status, br.requested_at, br.delivered_at,
               bb.name AS blood_bank_name
        FROM blood_request br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.requester_user_id = ? ORDER BY br.requested_at DESC LIMIT 4
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $recentRequests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT haemoglobin, blood_pressure_sys, blood_pressure_dia, pulse, weight_kg, recorded_at
        FROM donor_health_record WHERE donor_user_id = ? ORDER BY recorded_at DESC LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $latestHealth = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT haemoglobin, DATE_FORMAT(recorded_at, '%b') AS month_label, recorded_at
        FROM donor_health_record WHERE donor_user_id = ? AND haemoglobin IS NOT NULL
        ORDER BY recorded_at DESC LIMIT 6
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $hbTrend = array_reverse($stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    $stmt->close();

    $hbAlert = null;
    if ($latestHealth && (float)$latestHealth['haemoglobin'] < 12.5) {
        $hbAlert = [
            'level'   => (float)$latestHealth['haemoglobin'],
            'message' => 'Haemoglobin is below the recommended level. Eat iron-rich foods and stay hydrated.',
        ];
    }

    $emergencyRequests = [];
    if ($bloodGroup) {
        $stmt = $conn->prepare("
            SELECT er.id, er.extracted_blood_group AS blood_group, er.extracted_name,
                   er.extracted_location, er.status, er.matched_donor_count, er.created_at AS requested_at,
                   u.full_name AS requester_name
            FROM emergency_request er
            LEFT JOIN users u ON u.id = er.requester_user_id
            WHERE er.extracted_blood_group = ? AND er.requester_user_id != ?
            ORDER BY er.created_at DESC LIMIT 5
        ");
        $stmt->bind_param('si', $bloodGroup, $uid);
        $stmt->execute();
        $emergencyRequests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    $stmt = $conn->prepare("
        SELECT dp.promise_time, dp.status, dp.confirmation_code, bb.name AS blood_bank_name
        FROM donation_promise dp
        INNER JOIN blood_bank bb ON bb.id = dp.blood_bank_id
        WHERE dp.donor_user_id = ? AND dp.status = 'pending'
        ORDER BY dp.promise_time ASC LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $upcomingPromise = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT dd.id, dd.status, dd.estimated_arrival, dd.actual_arrival,
               dd.destination_lat, dd.destination_lng,
               dr.drone_code, dr.battery_level, dr.current_latitude, dr.current_longitude,
               br.id AS request_id, br.blood_group, br.units_required,
               bb.name AS source_bank_name
        FROM drone_dispatch dd
        INNER JOIN blood_request br ON br.id = dd.blood_request_id
        INNER JOIN drone dr ON dr.id = dd.drone_id
        LEFT JOIN blood_bank bb ON bb.id = dd.source_bank_id
        WHERE br.requester_user_id = ? AND dd.status IN ('dispatched','in_transit','en_route')
        ORDER BY dd.created_at DESC LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $activeDelivery = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT br.id, br.blood_group, br.units_required, br.urgency,
               br.status, br.requested_at, bb.name AS blood_bank_name
        FROM blood_request br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.requester_user_id = ? AND br.status = 'pending'
        ORDER BY br.requested_at DESC LIMIT 3
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $pendingApprovals = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $stmt = $conn->prepare("SELECT COUNT(*) AS cnt FROM notification WHERE user_id = ? AND is_read = 0");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $unreadCount = (int)$stmt->get_result()->fetch_assoc()['cnt'];
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT CONCAT_WS(', ', address_line, city, state, country) AS full_address
        FROM address WHERE entity_type = 'user' AND entity_id = ? LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $addrRow = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // ── Ensure couple alert is in sync ──
    try {
        syncThalassemiaCoupleAlert($uid);
    } catch (\Throwable $e) { /* table may not exist yet */
    }

    // ── Thalassemia carrier info for dashboard ──
    $thalUserCarrier = 'unknown';
    $thalPartnerCarrier = 'unknown';
    $thalPartnerName = null;
    $stmt = $conn->prepare("SELECT is_carrier FROM thalassemia_carrier WHERE user_id=? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $uc = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($uc) $thalUserCarrier = (int)$uc['is_carrier'] === 1 ? 'carrier' : 'non_carrier';

    $stmt = $conn->prepare("SELECT CASE WHEN user_id_1=? THEN user_id_2 ELSE user_id_1 END AS pid FROM partner_links WHERE status='active' AND (? IN (user_id_1,user_id_2)) LIMIT 1");
    $stmt->bind_param('ii', $uid, $uid);
    $stmt->execute();
    $plink = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($plink) {
        $pid = (int)$plink['pid'];
        $stmt = $conn->prepare("SELECT full_name FROM users WHERE id=? LIMIT 1");
        $stmt->bind_param('i', $pid);
        $stmt->execute();
        $pn = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $thalPartnerName = $pn ? $pn['full_name'] : null;

        $stmt = $conn->prepare("SELECT is_carrier FROM thalassemia_carrier WHERE user_id=? LIMIT 1");
        $stmt->bind_param('i', $pid);
        $stmt->execute();
        $pc = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($pc) $thalPartnerCarrier = (int)$pc['is_carrier'] === 1 ? 'carrier' : 'non_carrier';
    }


    // ── Thalassemia couple alert for dashboard ──
    $thalCoupleAlert = null;
    try {
        $stmt = $conn->prepare("
            SELECT tca.id, tca.risk_percentage, tca.advice, tca.created_at,
                   u1.full_name AS user1_name, u2.full_name AS user2_name
            FROM thalassemia_couple_alert tca
            LEFT JOIN users u1 ON u1.id = tca.user_id_1
            LEFT JOIN users u2 ON u2.id = tca.user_id_2
            WHERE (tca.user_id_1 = ? OR tca.user_id_2 = ?)
            LIMIT 1
        ");
        if ($stmt) {
            $stmt->bind_param('ii', $uid, $uid);
            $stmt->execute();
            $thalCoupleAlert = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        }
    } catch (\Throwable $e) { /* table may not exist yet */
    }

    jsonResponse([
        'success' => true,
        'thalassemia_couple_alert' => $thalCoupleAlert,
        'thal_user_carrier'        => $thalUserCarrier,
        'thal_partner_carrier'     => $thalPartnerCarrier,
        'thal_partner_name'        => $thalPartnerName,
        'user'    => [
            'user_id'            => (int)$user['id'],
            'display_id'         => 'DR-' . str_pad($user['id'], 5, '0', STR_PAD_LEFT),
            'full_name'          => $user['full_name'],
            'email'              => $user['email'],
            'phone'              => $user['phone'] ?? '',
            'blood_group'        => $bloodGroup,
            'member_since'       => date('M Y', strtotime($user['created_at'])),
            'address'            => $addrRow ? $addrRow['full_address'] : '',
            'is_available'       => (bool)($dr['is_available'] ?? 1),
            'next_eligible'      => $nextEligible,
            'family_legacy_id'   => $dr ? (int)$dr['family_legacy_id'] : null,
        ],
        'donor_recipient'    => $dr ?: null,
        'total_donations'    => (int)($dr['total_donations'] ?? 0),
        'trust_score'        => (int)($dr['trust_score'] ?? 100),
        'last_donation_date' => fmtDate($dr['last_donation_date'] ?? null),
        'next_eligible'      => $nextEligible,
        'lives_saved'        => (int)($dr['total_donations'] ?? 0) * 3,
        'active_requests'    => $activeCount,
        'last_request_status' => $lastReq['status'] ?? null,
        'last_request_id'    => $lastReq['id'] ?? null,
        'health'             => $latestHealth,
        'hb_trend'           => $hbTrend,
        'hb_alert'           => $hbAlert,
        'recent_donations'   => $recentDonations,
        'recent_requests'    => $recentRequests,
        'emergency_requests' => $emergencyRequests,
        'upcoming_promise'   => $upcomingPromise,
        'active_delivery'    => $activeDelivery,
        'pending_approvals'  => $pendingApprovals,
        'unread_notifications' => $unreadCount,
        'cooldown' => getCooldownInfo($uid),
    ]);
}

/* ══════════════════════════════════════════════════════════
   DONATION HISTORY
══════════════════════════════════════════════════════════ */
function handleDonations()
{
    global $conn;
    $uid = requireAuth();

    // Primary list: all donation_promise records (pending, fulfilled, cancelled, broken)
    $stmt = $conn->prepare("
        SELECT dp.id, dp.promise_time AS donation_date, dp.status, dp.confirmation_code,
               bb.name AS blood_bank_name, bb.city, dr.blood_group,
               dn.haemoglobin_level, dn.blood_pressure, dn.pulse, dn.health_check_notes,
               dp.fulfilled_at, dp.broken_at
        FROM donation_promise dp
        LEFT JOIN blood_bank bb ON bb.id = dp.blood_bank_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        LEFT JOIN donation dn ON dn.donation_promise_id = dp.id
        WHERE dp.donor_user_id = ?
        ORDER BY dp.promise_time DESC
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $donations = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Pending promises separately (for the pledge widget at the top)
    $promises = array_values(array_filter($donations, fn($d) => $d['status'] === 'pending'));

    jsonResponse(['success' => true, 'donations' => $donations, 'promises' => $promises]);
}

/* ══════════════════════════════════════════════════════════
   DONATION CERTIFICATE (standalone HTML/PDF)
   ══════════════════════════════════════════════════════════ */
function handleCertificate()
{
    global $conn;
    try {
        $uid = requireAuth();
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo 'Missing donation ID.';
            exit;
        }

        $stmt = $conn->prepare("
        SELECT dp.id, dp.promise_time AS donation_date, dp.status, dp.confirmation_code,
               dp.fulfilled_at, dp.broken_at,
               bb.name AS blood_bank_name, bb.city,
               dr.blood_group, dr.total_donations,
               u.full_name, u.email, u.phone
        FROM donation_promise dp
        LEFT JOIN blood_bank bb ON bb.id = dp.blood_bank_id
        LEFT JOIN donor_recipient dr ON dr.user_id = dp.donor_user_id
        LEFT JOIN users u ON u.id = dp.donor_user_id
        WHERE dp.id = ? AND dp.donor_user_id = ?
        LIMIT 1
    ");
        if (!$stmt) {
            header('Content-Type: text/plain');
            echo 'SQL prepare error: ' . $conn->error;
            exit;
        }
        $stmt->bind_param('ii', $id, $uid);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$row) {
            http_response_code(404);
            echo 'Donation not found.';
            exit;
        }

        // Fetch latest health check separately (optional)
        $health = ['haemoglobin_level' => null, 'blood_pressure' => null, 'pulse' => null, 'health_check_notes' => null];
        $hst = $conn->prepare("SELECT haemoglobin, blood_pressure_sys, blood_pressure_dia, pulse, notes FROM donor_health_record WHERE donor_user_id = ? ORDER BY recorded_at DESC LIMIT 1");
        if ($hst) {
            $hst->bind_param('i', $uid);
            $hst->execute();
            $hr = $hst->get_result()->fetch_assoc();
            $hst->close();
            if ($hr) {
                $health['haemoglobin_level'] = $hr['haemoglobin'];
                $health['blood_pressure'] = $hr['blood_pressure_sys'] ? $hr['blood_pressure_sys'] . '/' . $hr['blood_pressure_dia'] : null;
                $health['pulse'] = $hr['pulse'];
                $health['health_check_notes'] = $hr['notes'];
            }
        }

        $certNo = 'BB-' . strtoupper(substr(md5($row['id'] . 'CERT' . $row['confirmation_code']), 0, 10));
        $donorName = htmlspecialchars($row['full_name'] ?? 'Donor');
        $bloodGroup = htmlspecialchars($row['blood_group'] ?? '—');
        $bankName = htmlspecialchars($row['blood_bank_name'] ?? '—');
        $city = htmlspecialchars($row['city'] ?? '—');
        $address = '';
        $status = $row['status'] ?? 'fulfilled';
        $statusLabel = $status === 'fulfilled' ? 'Completed' : ($status === 'pending' ? 'Promised' : 'Cancelled');
        $confCode = htmlspecialchars($row['confirmation_code'] ?? '—');
        $donationDate = $row['donation_date'] ? date('F j, Y', strtotime($row['donation_date'])) : '—';
        $fulfilledAt = $row['fulfilled_at'] ? date('F j, Y \a\t g:i A', strtotime($row['fulfilled_at'])) : '—';
        $totalDonations = (int)($row['total_donations'] ?? 0);
        $email = htmlspecialchars($row['email'] ?? '');
        $phone = htmlspecialchars($row['phone'] ?? '');
        $hb = htmlspecialchars($health['haemoglobin_level'] ?? '—');
        $bp = htmlspecialchars($health['blood_pressure'] ?? '—');
        $pulse = htmlspecialchars($health['pulse'] ?? '—');
        $notes = htmlspecialchars($health['health_check_notes'] ?? '');
        $today = date('F j, Y');

        // Determine donation type
        $donationType = ($totalDonations <= 1) ? 'First Blood Donation' : (($totalDonations <= 5) ? 'Regular Blood Donation' : (($totalDonations <= 15) ? 'Committed Blood Donor' : (($totalDonations <= 25) ? 'Champion Blood Donor' : 'Lifetime Blood Donor')));
        if ($totalDonations >= 50) $donationType = 'Platinum Blood Donor';

        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BloodBridge — Donation Certificate</title>
<style>
  @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap");
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Inter", -apple-system, system-ui, sans-serif;
    background: #0b0e17;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 30px;
  }
  .cert-wrapper {
    max-width: 900px; width: 100%;
    background: linear-gradient(145deg, #0f1320 0%, #1a1f2e 100%);
    border-radius: 28px; padding: 8px;
    position: relative;
    box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(220,38,38,0.15);
  }
  .cert-inner {
    background: linear-gradient(180deg, #151b2b 0%, #0f1320 100%);
    border-radius: 22px; padding: 50px 48px 44px;
    position: relative; overflow: hidden;
    border: 1px solid rgba(220,38,38,0.08);
  }
  /* Ornamental corner accents */
  .cert-inner::before, .cert-inner::after {
    content: ""; position: absolute;
    width: 160px; height: 160px;
    border: 2px solid rgba(220,38,38,0.08);
    pointer-events: none;
  }
  .cert-inner::before { top: 18px; left: 18px; border-right: none; border-bottom: none; border-radius: 16px 0 0 0; }
  .cert-inner::after { bottom: 18px; right: 18px; border-left: none; border-top: none; border-radius: 0 0 16px 0; }
  /* Red top accent bar */
  .cert-accent-bar {
    width: 80px; height: 4px;
    background: linear-gradient(90deg, #dc2626, #ef4444, #dc2626);
    border-radius: 4px; margin: 0 auto 22px;
  }
  /* Logo / emblem */
  .cert-emblem {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    margin-bottom: 14px;
  }
  .cert-emblem-icon {
    width: 48px; height: 48px;
    background: linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.05));
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; border: 1px solid rgba(220,38,38,0.2);
  }
  .cert-emblem-text {
    font-family: "Playfair Display", serif;
    font-size: 1.4rem; font-weight: 900;
    background: linear-gradient(135deg, #fefefe, #c0c4d0);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 0.08em;
  }
  .cert-title {
    font-family: "Playfair Display", serif;
    font-size: 2.4rem; font-weight: 900;
    text-align: center;
    background: linear-gradient(135deg, #f5f5f5, #94a3b8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: 0.04em; margin-bottom: 4px;
  }
  .cert-subtitle {
    text-align: center;
    font-family: "Cormorant Garamond", serif;
    font-size: 1.1rem; font-style: italic;
    color: rgba(148,163,184,0.6);
    margin-bottom: 28px;
  }
  .cert-divider {
    width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(220,38,38,0.15), rgba(148,163,184,0.08), rgba(220,38,38,0.15), transparent);
    margin-bottom: 30px;
  }
  .cert-body { margin-bottom: 30px; }
  .cert-greeting {
    font-size: 1.05rem; color: rgba(226,232,240,0.85);
    text-align: center; line-height: 1.7; margin-bottom: 28px;
  }
  .cert-greeting strong { color: #f1f5f9; font-weight: 700; }
  .cert-greeting .highlight { color: #ef4444; }
  /* Detail grid */
  .cert-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 28px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 16px; padding: 24px 28px;
    margin-bottom: 24px;
  }
  .cert-detail-item {}
  .cert-detail-label {
    font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: rgba(148,163,184,0.5);
    margin-bottom: 2px;
  }
  .cert-detail-value {
    font-size: 0.95rem; font-weight: 600; color: #e2e8f0;
  }
  .cert-detail-value .blood-badge {
    display: inline-block;
    background: linear-gradient(135deg, #dc2626, #991b1b);
    color: #fff; padding: 1px 12px; border-radius: 20px;
    font-weight: 800; font-size: 0.85rem;
    letter-spacing: 0.05em;
  }
  /* Health metrics mini row */
  .cert-health {
    display: flex; gap: 20px; justify-content: center;
    margin-bottom: 24px; flex-wrap: wrap;
  }
  .cert-health-item {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
    padding: 8px 16px; border-radius: 30px;
  }
  .cert-health-item .h-icon { font-size: 1rem; }
  .cert-health-item .h-label {
    font-size: 0.62rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.06em; color: rgba(148,163,184,0.5);
  }
  .cert-health-item .h-value {
    font-size: 0.82rem; font-weight: 700; color: #e2e8f0;
  }
  /* Seal / Verification */
  .cert-seal-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 20px; flex-wrap: wrap;
    border-top: 1px solid rgba(255,255,255,0.04);
    padding-top: 22px; margin-top: 6px;
  }
  .cert-seal {
    display: flex; align-items: center; gap: 12px;
  }
  .cert-seal-stamp {
    width: 60px; height: 60px;
    border-radius: 50%;
    border: 2.5px solid rgba(220,38,38,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.8rem; opacity: 0.7;
    background: rgba(220,38,38,0.04);
    flex-shrink: 0;
  }
  .cert-seal-text {
    font-size: 0.72rem; color: rgba(148,163,184,0.5);
    line-height: 1.4;
  }
  .cert-seal-text strong { color: rgba(148,163,184,0.7); font-weight: 700; display: block; }
  .cert-verify {
    text-align: right;
    font-size: 0.68rem; color: rgba(148,163,184,0.35);
  }
  .cert-verify code {
    font-family: "Inter", monospace;
    background: rgba(255,255,255,0.03);
    padding: 3px 8px; border-radius: 6px;
    color: rgba(148,163,184,0.5); font-size: 0.7rem;
  }
  /* Footer */
  .cert-footer {
    text-align: center; margin-top: 20px;
    font-size: 0.65rem; color: rgba(148,163,184,0.25);
    letter-spacing: 0.06em;
  }
  /* Print styles */
  @media print {
    @page { size: A4 portrait; margin: 12mm; }
    body { background: #fff; padding: 0; }
    .cert-wrapper {
      box-shadow: none; border-radius: 0; padding: 0;
      background: #fff; max-width: 100%;
    }
    .cert-inner {
      background: #fff; border: 1px solid #e5e7eb;
      border-radius: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cert-inner::before, .cert-inner::after { border-color: rgba(220,38,38,0.12); }
    .cert-title { -webkit-text-fill-color: #1e293b; color: #1e293b; background: none; }
    .cert-emblem-text { -webkit-text-fill-color: #1e293b; color: #1e293b; background: none; }
    .cert-greeting { color: #475569; }
    .cert-greeting strong { color: #1e293b; }
    .cert-detail-value { color: #1e293b; }
    .cert-detail-label { color: #94a3b8; }
    .cert-health-item .h-value { color: #1e293b; }
    .cert-health-item .h-label { color: #94a3b8; }
    .cert-details { background: #f8fafc; border-color: #e2e8f0; }
    .cert-health-item { background: #f8fafc; border-color: #e2e8f0; }
    .cert-seal-stamp { border-color: rgba(220,38,38,0.25); }
    .cert-seal-text { color: #94a3b8; }
    .cert-seal-text strong { color: #64748b; }
    .cert-subtitle { color: #94a3b8; }
    .cert-accent-bar { background: #dc2626; }
    .cert-divider { background: linear-gradient(90deg, transparent, rgba(220,38,38,0.2), #cbd5e1, rgba(220,38,38,0.2), transparent); }
    .cert-verify { color: #94a3b8; }
    .cert-verify code { background: #f1f5f9; color: #64748b; }
    .cert-footer { color: #94a3b8; }
    .cert-greeting .highlight { color: #dc2626; }
  }
  @media (max-width: 600px) {
    .cert-inner { padding: 28px 20px; }
    .cert-title { font-size: 1.6rem; }
    .cert-details { grid-template-columns: 1fr; padding: 18px; }
    .cert-seal-row { flex-direction: column; align-items: flex-start; }
    body { padding: 14px; }
  }
</style>
</head>
<body>
<div class="cert-wrapper">
  <div class="cert-inner">
    <div class="cert-emblem">
      <div class="cert-emblem-icon">🩸</div>
      <span class="cert-emblem-text">BLOODBRIDGE</span>
    </div>
    <div class="cert-accent-bar"></div>
    <div class="cert-title">Certificate of Donation</div>
    <div class="cert-subtitle">— ' . $donationType . ' —</div>
    <div class="cert-divider"></div>

    <div class="cert-body">
      <div class="cert-greeting">
        This certifies that <strong>' . $donorName . '</strong> has voluntarily and altruistically
        donated <strong class="highlight">blood</strong> on
        <strong>' . $donationDate . '</strong>, contributing to the
        life-saving mission of <strong>BloodBridge</strong>.
        Their act of humanity reflects the spirit of selfless giving.
      </div>

      <div class="cert-details">
        <div class="cert-detail-item">
          <div class="cert-detail-label">Certificate No.</div>
          <div class="cert-detail-value">' . $certNo . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Donor Name</div>
          <div class="cert-detail-value">' . $donorName . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Blood Group</div>
          <div class="cert-detail-value"><span class="blood-badge">' . $bloodGroup . '</span></div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Donation Date</div>
          <div class="cert-detail-value">' . $donationDate . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Blood Bank</div>
          <div class="cert-detail-value">' . $bankName . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Location</div>
          <div class="cert-detail-value">' . ($address ? $address . ', ' : '') . $city . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Confirmation Code</div>
          <div class="cert-detail-value" style="font-family:monospace;letter-spacing:0.1em;">' . $confCode . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Status</div>
          <div class="cert-detail-value" style="color:' . ($status === 'fulfilled' ? '#4ade80' : ($status === 'pending' ? '#fbbf24' : '#f87171')) . ';">' . $statusLabel . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Total Donations</div>
          <div class="cert-detail-value">' . $totalDonations . ' donation' . ($totalDonations !== 1 ? 's' : '') . '</div>
        </div>
        <div class="cert-detail-item">
          <div class="cert-detail-label">Contact</div>
          <div class="cert-detail-value" style="font-size:0.82rem;">' . $email . ($phone ? ' · ' . $phone : '') . '</div>
        </div>
      </div>

      ' . ($hb !== '—' || $bp !== '—' || $pulse !== '—' ? '
      <div class="cert-health">
        ' . ($hb !== '—' ? '<div class="cert-health-item"><span class="h-icon">🩸</span><div><span class="h-label">Hb</span><br><span class="h-value">' . $hb . ' g/dL</span></div></div>' : '') . '
        ' . ($bp !== '—' ? '<div class="cert-health-item"><span class="h-icon">❤️</span><div><span class="h-label">BP</span><br><span class="h-value">' . $bp . '</span></div></div>' : '') . '
        ' . ($pulse !== '—' ? '<div class="cert-health-item"><span class="h-icon">💓</span><div><span class="h-label">Pulse</span><br><span class="h-value">' . $pulse . ' bpm</span></div></div>' : '') . '
      </div>' : '') . '

      ' . ($notes ? '<div style="text-align:center;font-size:0.78rem;color:rgba(148,163,184,0.5);margin-bottom:20px;font-style:italic;">" ' . $notes . ' "</div>' : '') . '
    </div>

    <div class="cert-seal-row">
      <div class="cert-seal">
        <div class="cert-seal-stamp">🏅</div>
        <div class="cert-seal-text">
          <strong>BloodBridge Authority</strong>
          Digitally Verified · ' . $today . '
        </div>
      </div>
      <div class="cert-verify">
        Verify at bloodbridge.app/cert<br>
        <code>' . $certNo . '</code>
      </div>
    </div>
    <div class="cert-footer">
      BLOODBRIDGE · SAVING LIVES, ONE DONATION AT A TIME
    </div>
  </div>
</div>
<script>
  window.onload = function () {
    setTimeout(function () { window.print(); }, 500);
  };
</script>
</body>
</html>';
        exit;
    } catch (Throwable $e) {
        header('Content-Type: text/plain; charset=utf-8');
        http_response_code(500);
        echo 'Certificate Error: ' . $e->getMessage() . "\nFile: " . $e->getFile() . ':' . $e->getLine();
        exit;
    }
}

/* ══════════════════════════════════════════════════════════
   HEALTH ANALYTICS
   ══════════════════════════════════════════════════════════ */
function handleHealth()
{
    global $conn;
    $uid = requireAuth();
    $stmt = $conn->prepare("
        SELECT haemoglobin, blood_pressure_sys, blood_pressure_dia, pulse, weight_kg, temperature, notes,
               DATE_FORMAT(recorded_at, '%b %d, %Y') AS record_date,
               DATE_FORMAT(recorded_at, '%b') AS month_label, recorded_at
        FROM donor_health_record WHERE donor_user_id = ? ORDER BY recorded_at DESC LIMIT 10
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $records = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT antibody_name, is_donor, DATE_FORMAT(detected_at, '%b %Y') AS detected_date
        FROM antibody_profile WHERE user_id = ? ORDER BY detected_at DESC
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $antibodies = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jsonResponse(['success' => true, 'records' => $records, 'antibodies' => $antibodies]);
}

/* ══════════════════════════════════════════════════════════
   EMERGENCY REQUESTS (respond as donor)
══════════════════════════════════════════════════════════ */
function handleRequests()
{
    global $conn;
    $uid = requireAuth();
    $stmt = $conn->prepare("SELECT blood_group FROM donor_recipient WHERE user_id = ?");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $bloodGroup = $stmt->get_result()->fetch_assoc()['blood_group'] ?? '';
    $stmt->close();

    $urgency = $_GET['urgency'] ?? 'all';
    $city    = $_GET['city']    ?? 'all';
    $group   = $_GET['group']   ?? 'all';
    if ($group === 'all') $group = $bloodGroup;

    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.urgency, br.status, br.notes,
               br.requested_at, br.required_by, br.visible_to,
               COALESCE(bb.name, 'Donor-to-Donor') AS hospital_name,
               COALESCE(bb.city, '') AS city,
               COALESCE(bb.phone, '') AS hospital_phone
        FROM blood_request br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.status IN ('pending', 'approved')
          AND br.visible_to IS NOT NULL
    ";
    $types = '';
    $params = [];
    if ($group) {
        $sql .= " AND br.blood_group = ?";
        $types .= 's';
        $params[] = $group;
    }
    if ($urgency !== 'all') {
        $sql .= " AND br.urgency = ?";
        $types .= 's';
        $params[] = $urgency;
    }
    if ($city !== 'all') {
        $sql .= " AND LOWER(COALESCE(bb.city, '')) = ?";
        $types .= 's';
        $params[] = strtolower($city);
    }
    $sql .= " ORDER BY FIELD(br.urgency,'emergency','urgent','normal'), br.requested_at DESC LIMIT 20";

    $stmt = $conn->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // ── Full pipeline tracking for donor's offered requests ──
    $stmt = $conn->prepare("
        SELECT
            bct.id               AS offer_id,
            bct.created_at       AS offered_at,
            bct.status           AS lab_status,
            bct.comments         AS lab_comments,

            /* Request info */
            br.id                AS request_id,
            br.blood_group,
            br.units_required,
            br.urgency,
            br.status            AS request_status,

            /* Requester info */
            ru.full_name         AS requester_name,

            /* Blood bag info (created after lab approval) */
            bb.id                AS bag_id,
            bb.status            AS bag_status,
            bb.bag_barcode,

            /* Blood bank info */
            bank.name            AS blood_bank_name,
            bank.city            AS blood_bank_city

        FROM blood_culture_test bct
        INNER JOIN blood_request br  ON br.id  = bct.request_id
        LEFT JOIN  users ru          ON ru.id  = br.requester_user_id
        LEFT JOIN  blood_bag bb      ON bb.id  = bct.blood_bag_id
        LEFT JOIN  blood_bank bank   ON bank.id = br.blood_bank_id
        WHERE bct.donor_user_id = ?
          AND bct.request_id IS NOT NULL
        ORDER BY bct.created_at DESC
        LIMIT 20
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $myResponses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse(['success' => true, 'requests' => $requests, 'my_responses' => $myResponses, 'donor_group' => $bloodGroup]);
}

function handleMyRequests()
{
    global $conn;
    $uid = requireAuth();
    $status = $_GET['status'] ?? 'all';
    $sql = "
        SELECT br.id, br.blood_group, br.units_required, br.units_fulfilled, br.urgency,
               br.blood_component, br.status, br.requested_at,
               br.required_by, br.approved_at, br.delivered_at, br.notes, br.request_hash,
               br.request_type, br.max_price_per_unit, br.payment_status,
               bb.name AS blood_bank_name, bb.city AS blood_bank_city,
               br.approved_by_user_id, br.approved_by_bank_id,
               au.full_name AS approved_by_user_name,
               ab.name AS approved_by_bank_name
        FROM blood_request br
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        LEFT JOIN users au ON au.id = br.approved_by_user_id
        LEFT JOIN blood_bank ab ON ab.id = br.approved_by_bank_id
        WHERE br.requester_user_id = ?
    ";
    $types = 'i';
    $params = [$uid];
    if ($status !== 'all') {
        $sql .= " AND br.status = ?";
        $types .= 's';
        $params[] = $status;
    }
    $sql .= " ORDER BY br.requested_at DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // For each approved donor-fulfilled request, fetch accepted bag info for Pay/DonorNotCome buttons
    $reqIds = array_column(array_filter($requests, function ($r) {
        return $r['status'] === 'approved' && !empty($r['approved_by_user_id']);
    }), 'id');

    $acceptedDonors = [];
    if (!empty($reqIds)) {
        $idsStr = implode(',', array_map('intval', $reqIds));
        $bagQ = $conn->query("
            SELECT bct.request_id, bb.id AS bag_id, bct.donor_user_id,
                   u.full_name AS donor_name, bct.donor_price, bct.price_accepted,
                   bb.status AS bag_status
            FROM blood_culture_test bct
            INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            INNER JOIN users u ON u.id = bct.donor_user_id
            WHERE bct.request_id IN ($idsStr)
              AND bb.status = 'used'
            ORDER BY bct.request_id, bct.id
        ");
        while ($bagRow = $bagQ->fetch_assoc()) {
            $rid = $bagRow['request_id'];
            if (!isset($acceptedDonors[$rid])) $acceptedDonors[$rid] = [];
            $acceptedDonors[$rid][] = $bagRow;
        }
    }

    // Attach accepted_donors to each request
    foreach ($requests as &$req) {
        $req['accepted_donors'] = $acceptedDonors[$req['id']] ?? [];
    }
    unset($req);

    // Also include own emergency voice requests
    $stmt = $conn->prepare("
        SELECT er.id, er.extracted_blood_group AS blood_group, NULL AS units_required,
               'emergency' AS urgency, 'voice' AS blood_component, er.status, er.created_at AS requested_at,
               NULL AS required_by, NULL AS approved_at, NULL AS delivered_at,
               er.voice_transcript AS notes, NULL AS request_hash, NULL AS blood_bank_name, NULL AS blood_bank_city,
               1 AS is_emergency, er.extracted_name, er.extracted_location, er.requester_phone,
               er.required_units, er.blood_bank_id
        FROM emergency_request er
        WHERE er.requester_user_id = ?
        ORDER BY er.created_at DESC LIMIT 10
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $emergencyReqs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Merge both lists, sort by requested_at DESC
    $merged = array_merge($requests, $emergencyReqs);
    usort($merged, function ($a, $b) {
        return strtotime($b['requested_at'] ?? '') - strtotime($a['requested_at'] ?? '');
    });

    jsonResponse(['success' => true, 'requests' => $merged]);
}

/* ══════════════════════════════════════════════════════════
   FULL PROFILE
══════════════════════════════════════════════════════════ */
function handleProfile()
{
    global $conn;
    $uid = requireAuth();
    $stmt = $conn->prepare("
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
               dr.blood_group, dr.date_of_birth, dr.gender, dr.weight_kg, dr.height_cm,
               dr.last_donation_date, dr.total_donations, dr.is_available, dr.trust_score,
               dr.family_legacy_id, dr.emergency_contact, dr.underlying_conditions,
               fl.family_name AS legacy_family_name
        FROM users u
        LEFT JOIN donor_recipient dr ON dr.user_id = u.id
        LEFT JOIN family_legacy fl ON fl.id = dr.family_legacy_id
        WHERE u.id = ? LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $profile = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Auto-create donor_recipient row if missing
    if (!$profile || !$profile['blood_group']) {
        $check = $conn->prepare("SELECT user_id FROM donor_recipient WHERE user_id = ?");
        $check->bind_param('i', $uid);
        $check->execute();
        $check->store_result();
        if ($check->num_rows === 0) {
            $check->close();
            $stmt = $conn->prepare("
                INSERT INTO donor_recipient (user_id, blood_group, date_of_birth, gender, weight_kg, height_cm,
                    last_donation_date, total_donations, is_available, trust_score, family_legacy_id,
                    emergency_contact, underlying_conditions)
                VALUES (?, '', NULL, NULL, 60.00, 165.00, NULL, 0, 1, 100, NULL, '', '')
            ");
            $stmt->bind_param('i', $uid);
            $stmt->execute();
            $stmt->close();
            // Re-fetch
            $stmt = $conn->prepare("
                SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
                       dr.blood_group, dr.date_of_birth, dr.gender, dr.weight_kg, dr.height_cm,
                       dr.last_donation_date, dr.total_donations, dr.is_available, dr.trust_score,
                       dr.family_legacy_id, dr.emergency_contact, dr.underlying_conditions,
                       fl.family_name AS legacy_family_name
                FROM users u
                LEFT JOIN donor_recipient dr ON dr.user_id = u.id
                LEFT JOIN family_legacy fl ON fl.id = dr.family_legacy_id
                WHERE u.id = ? LIMIT 1
            ");
            $stmt->bind_param('i', $uid);
            $stmt->execute();
            $profile = $stmt->get_result()->fetch_assoc();
            $stmt->close();
        } else {
            $check->close();
        }
    }
    if (!$profile) jsonResponse(['success' => false, 'error' => 'Profile not found.'], 404);

    $stmt = $conn->prepare("SELECT address_line, city, state, postal_code, country FROM address WHERE entity_type='user' AND entity_id=? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $address = $stmt->get_result()->fetch_assoc() ?: [];
    $stmt->close();

    // ── Thalassemia carrier status ──
    $thalStatus = 'unknown';
    $stmt = $conn->prepare("SELECT is_carrier, confirmed_at FROM thalassemia_carrier WHERE user_id = ? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $carrier = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($carrier) {
        $thalStatus = (int)$carrier['is_carrier'] === 1 ? 'carrier' : 'non_carrier';
        $profile['thalassemia_confirmed_at'] = $carrier['confirmed_at'];
    }
    $profile['thalassemia_status'] = $thalStatus;

    // ── Partner info ──
    $profile['partner'] = null;
    $stmt = $conn->prepare("
        SELECT pl.id, pl.status,
               CASE WHEN pl.user_id_1 = ? THEN pl.user_id_2 ELSE pl.user_id_1 END AS partner_id,
               u.full_name AS partner_name, u.email AS partner_email,
               pl.action_user, pl.created_at AS requested_at
        FROM partner_links pl
        LEFT JOIN users u ON u.id = CASE WHEN pl.user_id_1 = ? THEN pl.user_id_2 ELSE pl.user_id_1 END
        WHERE ? IN (pl.user_id_1, pl.user_id_2)
        ORDER BY pl.created_at DESC LIMIT 1
    ");
    $stmt->bind_param('iii', $uid, $uid, $uid);
    $stmt->execute();
    $link = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($link) {
        $profile['partner'] = $link;
    }

    // ── Couple alert info ──
    $profile['thalassemia_couple_alert'] = null;
    $stmt = $conn->prepare("
        SELECT tca.id, tca.risk_percentage, tca.advice, tca.created_at,
               u1.full_name AS user1_name, u2.full_name AS user2_name
        FROM thalassemia_couple_alert tca
        LEFT JOIN users u1 ON u1.id = tca.user_id_1
        LEFT JOIN users u2 ON u2.id = tca.user_id_2
        WHERE (tca.user_id_1 = ? OR tca.user_id_2 = ?)
        LIMIT 1
    ");
    $stmt->bind_param('ii', $uid, $uid);
    $stmt->execute();
    $alert = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($alert) {
        $profile['thalassemia_couple_alert'] = $alert;
    }

    jsonResponse(['success' => true, 'profile' => $profile, 'address' => $address]);
}

/* ══════════════════════════════════════════════════════════
   UPDATE PROFILE
══════════════════════════════════════════════════════════ */
function handleUpdateProfile()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) $data = $_POST;

    $fullName   = trim($data['full_name']    ?? '');
    $email      = trim($data['email']        ?? '');
    $phone      = trim($data['phone']        ?? '');
    $dob        = !empty($data['date_of_birth']) ? $data['date_of_birth'] : null;
    $gender     = $data['gender']            ?? null;
    $bloodGroup = $data['blood_group']       ?? null;
    $weightKg   = ($data['weight_kg'] ?? '') !== '' ? (float)$data['weight_kg'] : null;
    $heightCm   = ($data['height_cm'] ?? '') !== '' ? (float)$data['height_cm'] : null;
    $isAvail    = isset($data['is_available']) ? (int)(bool)$data['is_available'] : 1;
    $emergency  = trim($data['emergency_contact'] ?? '');
    $conditions = trim($data['underlying_conditions'] ?? '');
    $addrLine   = trim($data['address_line'] ?? '');
    $city       = trim($data['city']         ?? '');
    $state      = trim($data['state']        ?? '');
    $postal     = trim($data['postal_code']  ?? '');
    $country    = trim($data['country']      ?? 'Bangladesh');

    $errors = [];
    if (strlen($fullName) < 2) $errors[] = 'Full name must be at least 2 characters.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Please enter a valid email address.';
    if ($weightKg !== null && ($weightKg < 45 || $weightKg > 200)) $errors[] = 'Weight must be between 45 and 200 kg.';
    if ($heightCm !== null && ($heightCm < 100 || $heightCm > 250)) $errors[] = 'Height must be between 100 and 250 cm.';
    if (!empty($errors)) jsonResponse(['success' => false, 'errors' => $errors], 422);

    $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, email = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param('sssi', $fullName, $phone, $email, $uid);
    if (!$stmt->execute()) jsonResponse(['success' => false, 'error' => 'User update failed: ' . $conn->error], 500);
    $stmt->close();

    $stmt = $conn->prepare("SELECT user_id FROM donor_recipient WHERE user_id = ?");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $hasDr = $stmt->get_result()->num_rows > 0;
    $stmt->close();

    if ($hasDr) {
        $stmt = $conn->prepare("
            UPDATE donor_recipient
            SET blood_group = ?, date_of_birth = ?, gender = ?, weight_kg = ?, height_cm = ?,
                is_available = ?, emergency_contact = ?, underlying_conditions = ?
            WHERE user_id = ?
        ");
        $stmt->bind_param('sssddissi', $bloodGroup, $dob, $gender, $weightKg, $heightCm, $isAvail, $emergency, $conditions, $uid);
        $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare("
            INSERT INTO donor_recipient
            (user_id, blood_group, date_of_birth, gender, weight_kg, height_cm,
             is_available, emergency_contact, underlying_conditions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('isssddiss', $uid, $bloodGroup, $dob, $gender, $weightKg, $heightCm, $isAvail, $emergency, $conditions);
        $stmt->execute();
        $stmt->close();
    }

    $stmt = $conn->prepare("SELECT id FROM address WHERE entity_type = 'user' AND entity_id = ? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $addrId = $stmt->get_result()->fetch_assoc()['id'] ?? null;
    $stmt->close();
    if ($addrId) {
        $stmt = $conn->prepare("UPDATE address SET address_line = ?, city = ?, state = ?, postal_code = ?, country = ? WHERE id = ?");
        $stmt->bind_param('sssssi', $addrLine, $city, $state, $postal, $country, $addrId);
    } else {
        $stmt = $conn->prepare("INSERT INTO address (entity_type, entity_id, address_line, city, state, postal_code, country) VALUES ('user', ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param('isssss', $uid, $addrLine, $city, $state, $postal, $country);
    }
    $stmt->execute();
    $stmt->close();
    jsonResponse(['success' => true, 'message' => 'Profile updated successfully.']);
}

/* ══════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════ */
function handleNotifications()
{
    global $conn;
    $uid = requireAuth();
    $stmt = $conn->prepare("
        SELECT id, title, message, is_read, DATE_FORMAT(created_at, '%b %d, %Y %H:%i') AS created_at
        FROM notification WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $notifs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    $stmt = $conn->prepare("UPDATE notification SET is_read = 1 WHERE user_id = ?");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $stmt->close();
    jsonResponse(['success' => true, 'notifications' => $notifs]);
}

/* ══════════════════════════════════════════════════════════
   SAVE DONATION PROMISE
══════════════════════════════════════════════════════════ */
function handleAcceptRequest()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jsonResponse(['success' => false, 'error' => 'request_id is required.'], 422);

    $stmt = $conn->prepare("SELECT id, requester_user_id, blood_group, status, visible_to, blood_bank_id FROM blood_request WHERE id=? AND status='pending' LIMIT 1");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $isVoice = false;

    if (!$req) {
        $stmt = $conn->prepare("SELECT id, requester_user_id, extracted_blood_group AS blood_group, status FROM emergency_request WHERE id=? AND status='pending' LIMIT 1");
        $stmt->bind_param('i', $requestId);
        $stmt->execute();
        $req = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$req) jsonResponse(['success' => false, 'error' => 'Request not found or no longer pending.'], 404);
        $isVoice = true;
    }

    if (!$isVoice && !in_array($req['visible_to'], ['donor_recipient', 'both'], true))
        jsonResponse(['success' => false, 'error' => 'This request must be accepted by a blood bank.'], 403);

    if ((int)$req['requester_user_id'] === $uid)
        jsonResponse(['success' => false, 'error' => 'You cannot accept your own request.'], 403);

    $stmt = $conn->prepare("SELECT blood_group FROM donor_recipient WHERE user_id=? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $donorGroup = $stmt->get_result()->fetch_assoc()['blood_group'] ?? '';
    $stmt->close();
    if (empty($donorGroup)) jsonResponse(['success' => false, 'error' => 'Your blood group is not set. Update your profile first.'], 422);
    $compatCheck = ['O-' => ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], 'O+' => ['O+', 'A+', 'B+', 'AB+'], 'A-' => ['A-', 'A+', 'AB-', 'AB+'], 'A+' => ['A+', 'AB+'], 'B-' => ['B-', 'B+', 'AB-', 'AB+'], 'B+' => ['B+', 'AB+'], 'AB-' => ['AB-', 'AB+'], 'AB+' => ['AB+']];
    $canDonateTo = $compatCheck[$donorGroup] ?? [$donorGroup];
    if (!in_array($req['blood_group'], $canDonateTo, true))
        jsonResponse(['success' => false, 'error' => 'Your blood group (' . $donorGroup . ') cannot donate to ' . $req['blood_group'] . '. You can donate to: ' . implode(', ', $canDonateTo) . '.'], 422);

    /* Auto-add columns if ALTER TABLE was not run yet */
    $cols = [];
    $cr = $conn->query('SHOW COLUMNS FROM blood_culture_test');
    if ($cr) {
        while ($c = $cr->fetch_assoc()) $cols[] = $c['Field'];
    }
    if (!in_array('donor_user_id', $cols)) $conn->query('ALTER TABLE blood_culture_test ADD COLUMN donor_user_id INT NULL AFTER id');
    if (!in_array('request_id',    $cols)) $conn->query('ALTER TABLE blood_culture_test ADD COLUMN request_id INT NULL AFTER donor_user_id');
    if (!in_array('status',        $cols)) $conn->query("ALTER TABLE blood_culture_test ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER comments");
    if (!in_array('created_at',    $cols)) $conn->query('ALTER TABLE blood_culture_test ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status');
    if (!in_array('donor_price', $cols)) $conn->query("ALTER TABLE blood_culture_test ADD COLUMN donor_price DECIMAL(10,2) NULL DEFAULT NULL AFTER status");
    if (!in_array('price_accepted', $cols)) $conn->query("ALTER TABLE blood_culture_test ADD COLUMN price_accepted TINYINT(1) NOT NULL DEFAULT 0 AFTER donor_price");

    /* Check not already offered */
    $prev = $conn->query("SELECT id FROM blood_culture_test WHERE donor_user_id=$uid AND request_id=$requestId AND status='pending' LIMIT 1");
    if ($prev && $prev->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'You have already offered to donate for this request.'], 409);

    /* Donor price — validate against request type */
    $reqTypeRow = $conn->query("SELECT request_type, max_price_per_unit FROM blood_request WHERE id=$requestId LIMIT 1");
    $reqTypeMeta = $reqTypeRow ? $reqTypeRow->fetch_assoc() : [];
    $reqTypeVal  = $reqTypeMeta['request_type'] ?? 'free';
    if ($reqTypeVal === 'free' && isset($data['donor_price']) && (float)$data['donor_price'] > 0)
        jsonResponse(['success' => false, 'error' => 'This request only accepts free donations.'], 422);

    $donorPrice = null;
    if ($reqTypeVal === 'paid') {
        /* Paid requests require a price > 0 */
        $donorPrice = isset($data['donor_price']) ? (float)$data['donor_price'] : 0;
        if ($donorPrice <= 0)
            jsonResponse(['success' => false, 'error' => 'This is a paid request. Please set a price greater than 0.'], 422);
        $maxAllowed = (float)($reqTypeMeta['max_price_per_unit'] ?? 0);
        if ($maxAllowed > 0 && $donorPrice > $maxAllowed)
            jsonResponse(['success' => false, 'error' => "Your price (৳$donorPrice) exceeds the requester's maximum (৳$maxAllowed) per unit."], 422);
    } elseif ($reqTypeVal === 'open') {
        /* Open requests allow any price (0 = free) */
        $donorPrice = isset($data['donor_price']) && (float)$data['donor_price'] > 0 ? (float)$data['donor_price'] : null;
        $maxAllowed = (float)($reqTypeMeta['max_price_per_unit'] ?? 0);
        if ($maxAllowed > 0 && $donorPrice !== null && $donorPrice > $maxAllowed)
            jsonResponse(['success' => false, 'error' => "Your price (৳$donorPrice) exceeds the requester's maximum (৳$maxAllowed) per unit."], 422);
    }
    $dpVal = $donorPrice !== null ? $donorPrice : 'NULL';

    /* Insert culture test row */
    $ok = $conn->query("INSERT INTO blood_culture_test (donor_user_id, request_id, status, donor_price, created_at) VALUES ($uid, $requestId, 'pending', $dpVal, NOW())");
    if (!$ok) jsonResponse(['success' => false, 'error' => 'Could not save offer: ' . $conn->error], 500);

    $requesterUid = (int)$req['requester_user_id'];
    $donorName = 'A donor';
    $nStmt = $conn->prepare("SELECT full_name FROM users WHERE id=? LIMIT 1");
    if ($nStmt) {
        $nStmt->bind_param('i', $uid);
        $nStmt->execute();
        $donorName = $nStmt->get_result()->fetch_assoc()['full_name'] ?? 'A donor';
        $nStmt->close();
    }
    $notifStmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, 'Donor Offer Received', ?)");
    if ($notifStmt) {
        $priceNote = ($donorPrice && $donorPrice > 0)
            ? ' They are asking ৳' . number_format($donorPrice, 0) . ' per unit.'
            : ' This is a free donation offer.';
        $notifMsg = $donorName . ' has offered to donate for your request #REQ-' . str_pad($requestId, 4, '0', STR_PAD_LEFT) . '.' . $priceNote . ' A lab technician will verify and prepare the blood bag.';
        $notifStmt->bind_param('is', $requesterUid, $notifMsg);
        $notifStmt->execute();
        $notifStmt->close();
    }

    jsonResponse(['success' => true, 'message' => 'Your offer has been submitted! A lab technician will verify your blood and prepare the blood bag.', 'request_id' => $requestId]);
}

function handleEmergencyRequests()
{
    global $conn;
    $uid = requireAuth();

    $stmt = $conn->prepare("SELECT blood_group FROM donor_recipient WHERE user_id = ?");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $bloodGroup = $stmt->get_result()->fetch_assoc()['blood_group'] ?? '';
    $stmt->close();

    /* Filter by compatible blood groups - donor sees requests they can fulfil */
    $compatMap = [
        'O-'  => ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+'  => ['O+', 'A+', 'B+', 'AB+'],
        'A-'  => ['A-', 'A+', 'AB-', 'AB+'],
        'A+'  => ['A+', 'AB+'],
        'B-'  => ['B-', 'B+', 'AB-', 'AB+'],
        'B+'  => ['B+', 'AB+'],
        'AB-' => ['AB-', 'AB+'],
        'AB+' => ['AB+'],
    ];
    $compatGroups = !empty($bloodGroup) ? ($compatMap[$bloodGroup] ?? [$bloodGroup]) : [];
    if (empty($compatGroups)) {
        /* No blood group on record - show nothing */
        jsonResponse(['success' => true, 'requests' => [], 'my_responses' => [], 'donor_group' => '']);
    }
    $placeholders = implode(',', array_fill(0, count($compatGroups), '?'));

    // Emergency voice requests
    $types = 'i' . str_repeat('s', count($compatGroups));
    $params = array_merge([$uid], $compatGroups);
    $sql = "
        SELECT er.id, er.extracted_blood_group AS blood_group, er.extracted_name,
               er.extracted_location, er.voice_transcript, er.requester_phone,
               er.status, er.matched_donor_count, er.created_at AS requested_at,
               er.required_units, er.blood_bank_id,
               u.full_name AS requester_name, 1 AS is_voice
        FROM emergency_request er
        LEFT JOIN users u ON u.id = er.requester_user_id
        WHERE er.requester_user_id != ? AND er.status = 'pending'
          AND er.extracted_blood_group IN ($placeholders)
        ORDER BY er.created_at DESC LIMIT 20
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $requests = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Blood requests visible to donors
    $types2 = 'i' . str_repeat('s', count($compatGroups));
    $params2 = array_merge([$uid], $compatGroups);
    $sql2 = "
        SELECT br.id, br.blood_group,
               u2.full_name AS extracted_name,
               COALESCE(br.location_label, br.request_city, '') AS extracted_location,
               br.request_city,
               br.notes AS voice_transcript,
               COALESCE(u2.phone, '') AS requester_phone,
               br.status, 0 AS matched_donor_count, br.requested_at,
               u2.full_name AS requester_name, 0 AS is_voice,
               br.urgency, br.units_required, br.visible_to,
               br.request_type, br.max_price_per_unit,
               br.blood_bank_id, bb.name AS blood_bank_name
        FROM blood_request br
        LEFT JOIN users u2 ON u2.id = br.requester_user_id
        LEFT JOIN blood_bank bb ON bb.id = br.blood_bank_id
        WHERE br.visible_to IN ('donor_recipient', 'both')
          AND br.status = 'pending'
          AND br.requester_user_id != ?
          AND br.blood_group IN ($placeholders)
        ORDER BY FIELD(br.urgency,'emergency','urgent','normal'), br.requested_at DESC LIMIT 20
    ";
    $stmt2 = $conn->prepare($sql2);
    $stmt2->bind_param($types2, ...$params2);
    $stmt2->execute();
    $bloodReqs = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt2->close();

    // Merge both lists
    $allRequests = array_merge($requests, $bloodReqs);
    usort($allRequests, function ($a, $b) {
        $aTime = strtotime($a['requested_at'] ?? '0');
        $bTime = strtotime($b['requested_at'] ?? '0');
        return $bTime - $aTime;
    });

    /* ── Tag each request with whether the current donor already accepted it ──
       Checks blood_culture_test for blood_requests, and also for emergency_requests
       (both use the same table via accept_request handler).
    ── */
    if (!empty($allRequests)) {
        /* Collect all request IDs */
        $allIds = array_map(fn($r) => (int)($r['id'] ?? 0), $allRequests);
        $allIds = array_filter($allIds);
        if (!empty($allIds)) {
            $idList = implode(',', $allIds);
            $acceptedRows = $conn->query("
                SELECT DISTINCT request_id
                FROM blood_culture_test
                WHERE donor_user_id = $uid
                  AND request_id IN ($idList)
                  AND status IN ('pending','approved')
            ");
            $acceptedSet = [];
            if ($acceptedRows) {
                while ($ar = $acceptedRows->fetch_assoc()) {
                    $acceptedSet[(int)$ar['request_id']] = true;
                }
            }
            foreach ($allRequests as &$req) {
                $req['user_accepted'] = !empty($acceptedSet[(int)($req['id'] ?? 0)]);
            }
            unset($req);
        }
    }

    // ── Full pipeline tracking for donor's offered requests ──
    $stmt = $conn->prepare("
        SELECT
            bct.id               AS offer_id,
            bct.created_at       AS offered_at,
            bct.status           AS lab_status,
            bct.comments         AS lab_comments,

            /* Request info */
            br.id                AS request_id,
            br.blood_group,
            br.units_required,
            br.urgency,
            br.status            AS request_status,

            /* Requester info */
            ru.full_name         AS requester_name,

            /* Blood bag info (created after lab approval) */
            bb.id                AS bag_id,
            bb.status            AS bag_status,
            bb.bag_barcode,

            /* Blood bank info */
            bank.name            AS blood_bank_name,
            bank.city            AS blood_bank_city

        FROM blood_culture_test bct
        INNER JOIN blood_request br  ON br.id  = bct.request_id
        LEFT JOIN  users ru          ON ru.id  = br.requester_user_id
        LEFT JOIN  blood_bag bb      ON bb.id  = bct.blood_bag_id
        LEFT JOIN  blood_bank bank   ON bank.id = br.blood_bank_id
        WHERE bct.donor_user_id = ?
          AND bct.request_id IS NOT NULL
        ORDER BY bct.created_at DESC
        LIMIT 20
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $myResponses = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse(['success' => true, 'requests' => $allRequests, 'my_responses' => $myResponses, 'donor_group' => $bloodGroup]);
}


function handleSavePromise()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $promiseDate = trim($data['promise_date'] ?? '');
    $bloodBankId = (int)($data['blood_bank_id'] ?? 0);

    if (!$promiseDate) jsonResponse(['success' => false, 'error' => 'promise_date is required.'], 422);
    if (!$bloodBankId) jsonResponse(['success' => false, 'error' => 'blood_bank_id is required.'], 422);

    /* Date must be today or future */
    if (strtotime($promiseDate) < strtotime('today'))
        jsonResponse(['success' => false, 'error' => 'Promise date must be today or in the future.'], 422);

    /* Verify the selected bank/hospital/college exists and is active */
    $chk = $conn->query("
        SELECT id FROM blood_bank
        WHERE id = $bloodBankId
          AND status = 'active'
          AND role IN ('blood_bank','hospital','medical_college')
        LIMIT 1
    ");
    if (!$chk || !$chk->fetch_assoc())
        jsonResponse(['success' => false, 'error' => 'Selected location not found.'], 404);

    /* Generate unique 12-char confirmation code */
    $code = strtoupper(bin2hex(random_bytes(6)));

    /* Insert donation promise */
    $promiseTime = $conn->real_escape_string($promiseDate . ' 09:00:00');
    $stmt = $conn->prepare("
        INSERT INTO donation_promise
            (donor_user_id, blood_bank_id, promise_time, confirmation_code, status)
        VALUES (?, ?, ?, ?, 'pending')
    ");
    $stmt->bind_param('iiss', $uid, $bloodBankId, $promiseTime, $code);
    if (!$stmt->execute())
        jsonResponse(['success' => false, 'error' => 'Could not save promise: ' . $conn->error], 500);
    $stmt->close();

    /* Notify donor */
    $conn->query("
        INSERT INTO notification (user_id, title, message)
        VALUES ($uid, 'Donation Promise Saved',
                'Your donation has been scheduled. Confirmation code: $code. Thank you!')
    ");

    jsonResponse([
        'success'           => true,
        'message'           => 'Donation promise saved successfully!',
        'confirmation_code' => $code,
    ]);
}

function handleSimulateDrone()
{
    global $conn;
    $uid = requireAuth();
    $force = ($_GET['force'] ?? '') === '1';

    // Check for existing delivery for this user
    $stmt = $conn->prepare("
        SELECT dd.id, dd.status, dd.estimated_arrival, dd.actual_arrival,
               dd.destination_lat, dd.destination_lng, dd.tracking_data, dd.created_at,
               dd.current_lat, dd.current_lng, dd.speed_kmh, dd.battery_at_dispatch,
               dr.drone_code, dr.battery_level AS drone_battery,
               dr.status AS drone_status, dr.max_weight_kg,
               br.id AS request_id, br.blood_group, br.units_required,
               bb.name AS source_bank_name, bb.city AS source_bank_city,
               bb.latitude AS bank_lat, bb.longitude AS bank_lng
        FROM drone_dispatch dd
        INNER JOIN blood_request br ON br.id = dd.blood_request_id
        INNER JOIN drone dr ON dr.id = dd.drone_id
        LEFT JOIN blood_bank bb ON bb.id = dd.source_bank_id
        WHERE br.requester_user_id = ?
        ORDER BY dd.created_at DESC LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($existing && !$force) {
        jsonResponse(['success' => true, 'delivery' => $existing, 'simulated' => false]);
        return;
    }

    // Fetch user blood group (stored in donor_recipient table)
    $usr = $conn->query("SELECT dr.blood_group FROM donor_recipient dr WHERE dr.user_id = $uid")->fetch_assoc();
    $userBG = $usr['blood_group'] ?? 'O+';
    if (!$userBG) $userBG = 'O+';

    // Pick a drone & blood bank
    $droneRow = $conn->query("
        SELECT d.id, d.drone_code, d.battery_level, d.current_latitude, d.current_longitude,
               bb.id AS bank_id, bb.name AS bank_name, bb.city AS bank_city,
               bb.latitude AS bank_lat, bb.longitude AS bank_lng
        FROM drone d
        JOIN blood_bank bb ON bb.id = d.blood_bank_id
        WHERE d.status IN ('idle','dispatching')
        ORDER BY d.battery_level DESC LIMIT 1
    ")->fetch_assoc();

    // Fallback coords — Dhaka City
    $bankLat = 23.7642;
    $bankLng = 90.3800;
    $bankName = 'Blood Bank';
    $bankCity = 'Dhaka';
    $droneCode = 'BB-DR-001';
    $droneId = 1;
    $droneBat = 92;
    $bankId = 3;

    if ($droneRow) {
        $droneId   = (int)$droneRow['id'];
        $droneCode = $droneRow['drone_code'];
        $droneBat  = (int)$droneRow['battery_level'];
        $bankLat   = (float)($droneRow['bank_lat'] ?? $droneRow['current_latitude'] ?? 23.7642);
        $bankLng   = (float)($droneRow['bank_lng'] ?? $droneRow['current_longitude'] ?? 90.3800);
        $bankName  = $droneRow['bank_name'];
        $bankCity  = $droneRow['bank_city'] ?? 'Dhaka';
        $bankId    = (int)$droneRow['bank_id'];
    }

    // Destination — pick a facility with lat/lng different from source
    $destLat = 23.8750;
    $destLng = 90.4050;
    $destName = 'City Hospital'; // Default: north of most banks
    $hosp = $conn->query("
        SELECT id, name, latitude, longitude FROM blood_bank
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND NOT (latitude = $bankLat AND longitude = $bankLng)
        ORDER BY RAND() LIMIT 1
    ")->fetch_assoc();
    if ($hosp) {
        $destLat = (float)$hosp['latitude'];
        $destLng = (float)$hosp['longitude'];
        $destName = $hosp['name'];
    }

    // Create or get a blood request for this simulated delivery
    $reqStmt = $conn->prepare("
        SELECT id FROM blood_request
        WHERE requester_user_id = ? AND status IN ('approved','dispatched','in_transit')
        LIMIT 1
    ");
    $reqStmt->bind_param('i', $uid);
    $reqStmt->execute();
    $reqRow = $reqStmt->get_result()->fetch_assoc();
    $reqStmt->close();

    $requestId = $reqRow ? (int)$reqRow['id'] : 0;

    if (!$requestId) {
        // Create a simulated blood request
        $reqIns = $conn->prepare("
            INSERT INTO blood_request (requester_user_id, blood_group, units_required, urgency, status, delivery_method, requested_at, blood_bank_id)
            VALUES (?, ?, 1, 'normal', 'approved', 'drone', NOW(), ?)
        ");
        $reqIns->bind_param('isi', $uid, $userBG, $bankId);
        $reqIns->execute();
        $reqIns->close();
        $requestId = $conn->insert_id;
    }

    // Check if dispatch already exists for this request
    $dispChk = $conn->prepare("SELECT id, status FROM drone_dispatch WHERE blood_request_id = ? LIMIT 1");
    $dispChk->bind_param('i', $requestId);
    $dispChk->execute();
    $dispRow = $dispChk->get_result()->fetch_assoc();
    $dispChk->close();

    if ($dispRow) {
        $dispatchId = (int)$dispRow['id'];
        $dispStatus = $dispRow['status'];
        // If it's stuck on scheduled, advance it
        if ($dispStatus === 'scheduled') {
            $upd1 = $conn->prepare("UPDATE drone_dispatch SET status = 'in_transit', estimated_arrival = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?");
            $upd1->bind_param('i', $dispatchId);
            $upd1->execute();
            $upd1->close();
            $upd2 = $conn->prepare("UPDATE drone SET status = 'delivering' WHERE id = ?");
            $upd2->bind_param('i', $droneId);
            $upd2->execute();
            $upd2->close();
        }
    } else {
        // Create dispatch
        $eta = date('Y-m-d H:i:s', time() + 900);
        $ins = $conn->prepare("
            INSERT INTO drone_dispatch (drone_id, blood_request_id, source_bank_id, destination_lat, destination_lng, status, estimated_arrival, battery_at_dispatch, speed_kmh, current_lat, current_lng)
            VALUES (?, ?, ?, ?, ?, 'in_transit', ?, ?, 55.0, ?, ?)
        ");
        $ins->bind_param('iiiddsidd', $droneId, $requestId, $bankId, $destLat, $destLng, $eta, $droneBat, $bankLat, $bankLng);
        $ins->execute();
        $dispatchId = $conn->insert_id;
        $ins->close();
        $upd3 = $conn->prepare("UPDATE drone SET status = 'delivering' WHERE id = ?");
        $upd3->bind_param('i', $droneId);
        $upd3->execute();
        $upd3->close();
        $dispStatus = 'in_transit';
    }

    // Fetch final delivery record
    $fin = $conn->prepare("
        SELECT dd.id, dd.status, dd.estimated_arrival, dd.actual_arrival,
               dd.destination_lat, dd.destination_lng, dd.tracking_data, dd.created_at,
               dd.current_lat, dd.current_lng, dd.speed_kmh, dd.battery_at_dispatch,
               dr.drone_code, dr.battery_level AS drone_battery,
               dr.status AS drone_status, dr.max_weight_kg,
               br.id AS request_id, br.blood_group, br.units_required,
               bb.name AS source_bank_name, bb.city AS source_bank_city,
               bb.latitude AS bank_lat, bb.longitude AS bank_lng
        FROM drone_dispatch dd
        INNER JOIN blood_request br ON br.id = dd.blood_request_id
        INNER JOIN drone dr ON dr.id = dd.drone_id
        LEFT JOIN blood_bank bb ON bb.id = dd.source_bank_id
        WHERE dd.id = ?
    ");
    $fin->bind_param('i', $dispatchId);
    $fin->execute();
    $final = $fin->get_result()->fetch_assoc();
    $fin->close();

    $final['destination_name'] = $destName;

    jsonResponse(['success' => true, 'delivery' => $final, 'simulated' => true]);
}

/* ══════════════════════════════════════════════════════════
   APPROVALS
══════════════════════════════════════════════════════════ */
function handleApprovals()
{
    global $conn;
    $uid = requireAuth();
    $stmt = $conn->prepare("
        SELECT br.id AS request_id, br.blood_group, br.units_required, br.urgency,
               br.status AS request_status, br.requested_at,
               ast.id AS step_id, ast.step_order, ast.status AS step_status, ast.comments, ast.created_at AS step_created,
               u.full_name AS approver_name
        FROM blood_request br
        LEFT JOIN approval_step ast ON ast.entity_id = br.id AND ast.entity_type = 'blood_request'
        LEFT JOIN users u ON u.id = ast.approver_user_id
        WHERE br.requester_user_id = ?
        ORDER BY br.requested_at DESC, ast.step_order ASC
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $grouped = [];
    foreach ($rows as $row) {
        $rid = $row['request_id'];
        if (!isset($grouped[$rid])) {
            $grouped[$rid] = [
                'request_id' => $rid,
                'blood_group' => $row['blood_group'],
                'units_required' => (int)$row['units_required'],
                'urgency' => $row['urgency'],
                'request_status' => $row['request_status'],
                'requested_at' => $row['requested_at'],
                'steps' => [],
            ];
        }
        if ($row['step_id']) {
            $grouped[$rid]['steps'][] = [
                'step_order' => $row['step_order'],
                'status' => $row['step_status'],
                'comments' => $row['comments'],
                'approver' => $row['approver_name'],
                'created_at' => $row['step_created'],
            ];
        }
    }
    jsonResponse(['success' => true, 'approvals' => array_values($grouped)]);
}

/* ══════════════════════════════════════════════════════════
   SUBMIT BLOOD REQUEST
══════════════════════════════════════════════════════════ */
function handleSubmitRequest()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $units      = (int)($data['units_required'] ?? 1);
    $urgency    = $data['urgency']              ?? 'normal';
    $bankId     = isset($data['blood_bank_id']) ? (int)$data['blood_bank_id'] : null;
    $hospitalId = (int)($data['hospital_id']    ?? 0) ?: null;
    $notes      = trim($data['notes']           ?? '');
    $requiredBy = !empty($data['required_by'])  ? $data['required_by'] : null;
    $component  = trim($data['blood_component'] ?? 'whole_blood');
    $visibleTo  = $data['visible_to']           ?? 'both';
    $locLat     = isset($data['location_lat'])  ? (float)$data['location_lat'] : null;
    $locLng     = isset($data['location_lng'])  ? (float)$data['location_lng'] : null;
    $locLabel   = trim($data['location_label']  ?? '');
    $reqCity    = trim($data['request_city']    ?? '');
    $bg         = trim($data['blood_group']     ?? '');
    $splits        = $data['splits']               ?? null;
    $requestType   = $data['request_type']         ?? 'free';
    $maxPrice      = isset($data['max_price_per_unit']) && $data['max_price_per_unit'] > 0
        ? (float)$data['max_price_per_unit'] : null;

    /* Validate request_type */
    if (!in_array($requestType, ['free', 'paid', 'open'], true)) $requestType = 'free';
    /* Paid/open requests must have a max price */
    if (in_array($requestType, ['paid', 'open'], true) && !$maxPrice)
        jsonResponse(['success' => false, 'error' => 'Max price per unit is required for paid/open requests.'], 422);
    /* Free requests cannot have a price */
    if ($requestType === 'free') $maxPrice = null;

    if (!$bg) {
        $stmt = $conn->prepare("SELECT blood_group FROM donor_recipient WHERE user_id = ?");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $bg = $stmt->get_result()->fetch_assoc()['blood_group'] ?? '';
        $stmt->close();
    }

    $componentMap = [
        'Whole Blood' => 'whole_blood',
        'RBC' => 'prbc',
        'Platelets' => 'platelets',
        'Plasma' => 'plasma',
        'Cryoprecipitate' => 'cryoprecipitate',
        'whole_blood' => 'whole_blood',
        'prbc' => 'prbc',
        'platelets' => 'platelets',
        'plasma' => 'plasma',
        'cryoprecipitate' => 'cryoprecipitate',
    ];
    $component = $componentMap[$component] ?? 'whole_blood';

    if ($visibleTo !== 'donor_recipient' && !$bankId && !$splits) {
        jsonResponse(['success' => false, 'error' => 'Blood bank is required for this visibility setting.'], 422);
    }
    if ($units < 1 || $units > 10) jsonResponse(['success' => false, 'error' => 'Units must be 1–10.'], 422);
    if (!$bg)                jsonResponse(['success' => false, 'error' => 'Blood group not set.'], 422);

    /* ── Split request ── */
    if ($splits && is_array($splits) && count($splits) > 0) {
        $parentHash = strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
        $parentId = null;
        $childIds = [];
        $conn->begin_transaction();
        try {
            foreach ($splits as $s) {
                $sid  = (int)($s['blood_bank_id'] ?? 0);
                $sunits = (int)($s['units'] ?? 1);
                if (!$sid) throw new Exception('Split item missing blood_bank_id.');
                $shash = strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
                $sbnk = $sid;
                $shsp = $hospitalId ?: 'NULL';
                $srb  = $requiredBy ? "'" . $conn->real_escape_string($requiredBy) . "'" : 'NULL';
                $sll  = $locLat !== null ? $locLat : 'NULL';
                $sln  = $locLng !== null ? $locLng : 'NULL';
                $svs  = "'" . $conn->real_escape_string($visibleTo) . "'";
                $slb  = $locLabel ? "'" . $conn->real_escape_string($locLabel) . "'" : 'NULL';
                $src  = $reqCity ? "'" . $conn->real_escape_string($reqCity) . "'" : 'NULL';
                $sbg  = "'" . $conn->real_escape_string($bg) . "'";
                $sur  = "'" . $conn->real_escape_string($urgency) . "'";
                $sco  = "'" . $conn->real_escape_string($component) . "'";
                $sno  = $notes ? "'" . $conn->real_escape_string($notes) . "'" : "''";
                $sha  = "'" . $conn->real_escape_string($shash) . "'";
                $par  = $parentId !== null ? $parentId : 'NULL';

                $srtE = "'" . $conn->real_escape_string($requestType) . "'";
                $smpE = $maxPrice !== null ? $maxPrice : 'NULL';
                $isql = "INSERT INTO blood_request
                        (blood_bank_id, requester_user_id, hospital_id, blood_group, units_required, urgency, blood_component, status, request_hash, requested_at, required_by, notes, visible_to, location_lat, location_lng, location_label, request_city, parent_request_id, request_type, max_price_per_unit, payment_status)
                        VALUES ($sbnk, $uid, $shsp, $sbg, $sunits, $sur, $sco, 'pending', $sha, NOW(), $srb, $sno, $svs, $sll, $sln, $slb, $src, $par, $srtE, $smpE, 'not_required')";
                if (!$conn->query($isql)) throw new Exception($conn->error);
                $cid = $conn->insert_id;
                if ($parentId === null) {
                    $parentId = $cid;
                    $parentHash = $shash;
                }
                $childIds[] = $cid;
                $tl = $conn->prepare("INSERT INTO request_timeline (request_id, status, changed_by_user_id, remarks) VALUES (?, 'pending', ?, 'Split request submitted to bank')");
                $tl->bind_param('ii', $cid, $uid);
                $tl->execute();
                $tl->close();
            }
            if ($parentId && count($childIds) > 1) {
                $up = $conn->prepare("UPDATE blood_request SET parent_request_id = ? WHERE id = ?");
                foreach ($childIds as $cid) {
                    $up->bind_param('ii', $parentId, $cid);
                    $up->execute();
                }
                $up->close();
            }
            $conn->commit();

            /* Update patient_registry.last_blood_request for split requests too */
            $conn->query("
                UPDATE patient_registry pr
                INNER JOIN users u ON u.phone = pr.phone OR u.full_name = pr.full_name
                SET pr.last_blood_request = NOW()
                WHERE u.id = $uid
            ");

            jsonResponse(['success' => true, 'message' => 'Split request submitted successfully.', 'parent_id' => $parentId, 'child_ids' => $childIds]);
        } catch (Exception $e) {
            $conn->rollback();
            jsonResponse(['success' => false, 'error' => 'Split submission failed: ' . $e->getMessage()], 500);
        }
        return;
    }

    /* ── Single or donor-only request ── */
    $hash = strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
    $bnk = $bankId ?: 'NULL';
    $hsp = $hospitalId ?: 'NULL';
    $rb  = $requiredBy ? "'" . $conn->real_escape_string($requiredBy) . "'" : 'NULL';
    $ll  = $locLat !== null ? $locLat : 'NULL';
    $ln  = $locLng !== null ? $locLng : 'NULL';
    $vs  = "'" . $conn->real_escape_string($visibleTo) . "'";
    $lb  = $locLabel ? "'" . $conn->real_escape_string($locLabel) . "'" : 'NULL';
    $rc  = $reqCity ? "'" . $conn->real_escape_string($reqCity) . "'" : 'NULL';
    $bgE = "'" . $conn->real_escape_string($bg) . "'";
    $urE = "'" . $conn->real_escape_string($urgency) . "'";
    $coE = "'" . $conn->real_escape_string($component) . "'";
    $noE = $notes ? "'" . $conn->real_escape_string($notes) . "'" : "''";
    $haE = "'" . $conn->real_escape_string($hash) . "'";

    $rtE  = "'" . $conn->real_escape_string($requestType) . "'";
    $mpE  = $maxPrice !== null ? $maxPrice : 'NULL';

    $sql = "INSERT INTO blood_request
        (blood_bank_id, requester_user_id, hospital_id, blood_group, units_required, urgency, blood_component, status, request_hash, requested_at, required_by, notes, visible_to, location_lat, location_lng, location_label, request_city, request_type, max_price_per_unit, payment_status)
        VALUES ($bnk, $uid, $hsp, $bgE, $units, $urE, $coE, 'pending', $haE, NOW(), $rb, $noE, $vs, $ll, $ln, $lb, $rc, $rtE, $mpE, 'not_required')";
    if (!$conn->query($sql)) jsonResponse(['success' => false, 'error' => 'Failed to submit: ' . $conn->error], 500);
    $newId = $conn->insert_id;

    if ($newId) {
        $tl = $conn->prepare("INSERT INTO request_timeline (request_id, status, changed_by_user_id, remarks) VALUES (?, 'pending', ?, 'Request submitted')");
        $tl->bind_param('ii', $newId, $uid);
        $tl->execute();
        $tl->close();

        /* Update patient_registry.last_blood_request so the doctor dashboard
           shows the correct last request date for this patient */
        $conn->query("
            UPDATE patient_registry pr
            INNER JOIN users u ON u.phone = pr.phone OR u.full_name = pr.full_name
            SET pr.last_blood_request = NOW()
            WHERE u.id = $uid
        ");

        // NOTE: Auto-approval removed intentionally.
        // Requests must be accepted by another donor (visible_to=donor_recipient)
        // or by a blood bank (visible_to=blood_bank) before status becomes 'approved'.
    }

    jsonResponse(['success' => true, 'message' => 'Blood request submitted!', 'request_id' => $newId, 'request_hash' => $hash]);
}

/* ══════════════════════════════════════════════════════════
   EMERGENCY VOICE REQUEST
══════════════════════════════════════════════════════════ */
/**
 * Call Google Gemini API to extract structured info from any Bangla/English transcript.
 * Falls back gracefully — returns null on any failure.
 */
function geminiExtract($transcript)
{
    if (!defined('GEMINI_API_KEY') || empty(GEMINI_API_KEY)) {
        return null;
    }

    $prompt = <<<PROMPT
You are an emergency medical assistant for Bangladesh. Extract from the following voice transcript:

1. **requester_name** — person's name (Bangla or English)
2. **blood_group** — blood group needed (e.g. A+, B-, O+, AB+)
3. **location** — hospital name / area / city (Bangla or English)
4. **phone** — phone number if mentioned (Bangla digits ০-৯ → 0-9)

Rules:
- If a field is not found, use empty string ""
- Return ONLY valid JSON, no extra text
- Normalize Bangla digits to English (e.g. ০১৭১ → 0171)

Transcript:
$transcript
PROMPT;

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . GEMINI_API_KEY;

    $body = json_encode([
        'contents' => [[
            'parts' => [['text' => $prompt]]
        ]],
        'generationConfig' => [
            'temperature'   => 0.1,
            'maxOutputTokens' => 200,
        ]
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($resp)) {
        return null;
    }

    $data = json_decode($resp, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
    $text = trim($text);
    // Strip markdown code fences if present
    if (preg_match('/```(?:json)?\s*([\s\S]+?)\s*```/', $text, $m)) {
        $text = trim($m[1]);
    }
    $parsed = json_decode($text, true);
    if (!is_array($parsed)) {
        return null;
    }

    return [
        'name'     => trim($parsed['name'] ?? $parsed['requester_name'] ?? ''),
        'blood_group' => strtoupper(trim($parsed['blood_group'] ?? '')),
        'location' => trim($parsed['location'] ?? ''),
        'phone'    => trim($parsed['phone'] ?? ''),
    ];
}

/**
 * Call OpenRouter API to extract structured info from any Bangla/English voice transcript.
 * Returns null on any failure → cascades to Gemini → regex fallback.
 */
function openrouterExtract($transcript)
{
    if (!defined('OPENROUTER_API_KEY') || empty(OPENROUTER_API_KEY)) return null;

    $system = 'You are an emergency medical assistant for Bangladesh. Extract structured JSON from voice transcripts.';
    $prompt = <<<PROMPT
Extract from the following voice transcript:

1. **requester_name** — person's name (Bangla or English)
2. **blood_group** — blood group needed (e.g. A+, B-, O+, AB+)
3. **location** — hospital name / area / city (Bangla or English)
4. **phone** — phone number if mentioned (Bangla digits ০-৯ → 0-9)

Rules:
- If a field is not found, use empty string ""
- Return ONLY valid JSON, no extra text
- Normalize Bangla digits to English (e.g. ০১৭১ → 0171)

Transcript:
$transcript
PROMPT;

    $url = 'https://openrouter.ai/api/v1/chat/completions';
    $body = json_encode([
        'model'       => OPENROUTER_MODEL,
        'messages'    => [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user',   'content' => $prompt],
        ],
        'temperature' => 0.1,
        'max_tokens'  => 200,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENROUTER_API_KEY,
            'HTTP-Referer: https://bloodbridge.com',
            'X-Title: Blood Bridge',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || empty($resp)) return null;

    $data = json_decode($resp, true);
    $text = $data['choices'][0]['message']['content'] ?? '';
    $text = trim($text);
    if (preg_match('/```(?:json)?\s*([\s\S]+?)\s*```/', $text, $m)) $text = trim($m[1]);

    $parsed = json_decode($text, true);
    if (!is_array($parsed)) return null;

    return [
        'name'     => trim($parsed['name'] ?? $parsed['requester_name'] ?? ''),
        'blood_group' => strtoupper(trim($parsed['blood_group'] ?? '')),
        'location' => trim($parsed['location'] ?? ''),
        'phone'    => trim($parsed['phone'] ?? ''),
    ];
}

function handleEmergencyVoice()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $transcript = trim($data['transcript'] ?? '');
    $phone      = trim($data['phone']       ?? '');
    $requiredUnits = (int)($data['required_units'] ?? 1);
    $bloodBankId   = (int)($data['blood_bank_id'] ?? 0);
    if ($requiredUnits < 1) $requiredUnits = 1;
    if ($requiredUnits > 10) $requiredUnits = 10;

    if (!$transcript) {
        jsonResponse(['success' => false, 'error' => 'Voice transcript is required.'], 422);
    }

    // Get user's blood group and emergency contact from profile
    $stmt = $conn->prepare("SELECT blood_group, emergency_contact FROM donor_recipient WHERE user_id = ?");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $dr = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $bg = $dr['blood_group'] ?? '';
    $profileBg = $bg;

    // Use the provided phone, fall back to profile emergency_contact
    if (empty($phone) && !empty($dr['emergency_contact'])) {
        $phone = $dr['emergency_contact'];
    }

    if (!$phone) {
        jsonResponse(['success' => false, 'error' => 'Phone number is required for emergency contact.'], 422);
    }

    // Step 1: Try OpenRouter AI extraction (primary)
    $aiResult = openrouterExtract($transcript);

    // Step 2: Fallback to Gemini (quota-limited)
    if ($aiResult === null) {
        $aiResult = geminiExtract($transcript);
    }

    // Step 3: If any AI extracted data, use it
    if ($aiResult !== null) {
        $extractedName     = $aiResult['name'];
        $extractedBG       = !empty($aiResult['blood_group']) ? $aiResult['blood_group'] : $profileBg;
        $extractedLocation = $aiResult['location'];
        // Override phone only if AI found one
        $phone = !empty($aiResult['phone']) ? $aiResult['phone'] : $phone;
    } else {
        // Final fallback: comprehensive regex NLP (bilingual: English + Bangla)
        $extractedName     = '';
        $extractedBG       = $profileBg;
        $extractedLocation = '';

        // ========================================
        // NAME extraction (try English first)
        // ========================================

        // English: "name is X", "name X", "my name is X", "I am X"
        if (!$extractedName && preg_match('/(?:my\s+)?name\s+(?:is\s+)?(.+?)(?:\.|,|$)/i', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        if (!$extractedName && preg_match('/i\'?m\s+(.+?)(?:\.|,|$)/i', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        if (!$extractedName && preg_match('/this\s+is\s+(.+?)(?:\.|,|$)/i', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }

        // Bangla: "আমার নাম X", "আমার নাম হলো X", "আমার নাম X হলো", "নাম X", "নাম হলো X"
        // Pattern A: নাম [হচ্ছে/হলো/হোল] X  (helper verb BEFORE name)
        if (!$extractedName && preg_match('/আমার\s+নাম\s+(?:(?:হচ্ছে|হলো|হোল)\s+)?(.+?)(?:[,।]|$)/u', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        // Pattern B: নাম X হলো/হচ্ছে  (helper verb AFTER name)
        if (!$extractedName && preg_match('/আমার\s+নাম\s+(.+?)\s+(?:হচ্ছে|হলো|হোল)(?:[,।]|$)/u', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        // Clause-start নাম [হচ্ছে/হলো/হোল] X
        if (!$extractedName && preg_match('/(?:^|[,।])\s*নাম\s+(?:(?:হচ্ছে|হলো|হোল)\s+)?(.+?)(?:[,।]|$)/u', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        // Clause-start নাম X হলো/হচ্ছে
        if (!$extractedName && preg_match('/(?:^|[,।])\s*নাম\s+(.+?)\s+(?:হচ্ছে|হলো|হোল)(?:[,।]|$)/u', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }
        // "X বলছি" (phone-style: "Rajib speaking")
        if (!$extractedName && preg_match('/(.+?)\s+বলছি/u', $transcript, $m)) {
            $maybe = trim($m[1]);
            if (!preg_match('/[,\-\d]/u', $maybe) && mb_strlen($maybe) < 30) {
                $extractedName = $maybe;
            }
        }
        // "আমি X" (I am X — only if X is short and NOT a known location word)
        if (!$extractedName && preg_match('/(?:আমি|আমার)\s+(.+?)(?:[,।]|$)/u', $transcript, $m)) {
            $maybe = trim($m[1]);
            $locationKeywords = [
                'আছি',
                'রয়েছে',
                'দরকার',
                'লাগবে',
                'লাগবো',
                'প্রয়োজন',
                'হাসপাতাল',
                'মেডিকেল',
                'কলেজ',
                'ক্লিনিক',
                'ঠিকানা',
                'উপজেলা',
                'জেলা',
                'শহর',
                'গ্রাম',
                'বাসা',
                'বাড়ি'
            ];
            $isLocation = false;
            foreach ($locationKeywords as $kw) {
                if (mb_strpos($maybe, $kw) !== false) {
                    $isLocation = true;
                    break;
                }
            }
            if (!$isLocation && mb_strlen($maybe) < 25) {
                $extractedName = $maybe;
            }
        }
        // "ডাক্তার X"
        if (!$extractedName && preg_match('/ডাক্তার\s+(.+?)(?:[,।]|$)/u', $transcript, $m)) {
            $extractedName = trim($m[1]);
        }

        // Fallback: comma-first name ("Rajib, I am at hospital")
        if (!$extractedName && preg_match('/^([\p{L}\s.]+)\s*[,]/u', $transcript, $m)) {
            $maybe = trim($m[1]);
            $locationKeywords = [
                'আছি',
                'রয়েছে',
                'দরকার',
                'লাগবে',
                'লাগবো',
                'প্রয়োজন',
                'হাসপাতাল',
                'মেডিকেল',
                'কলেজ',
                'ক্লিনিক',
                'ঠিকানা',
                'উপজেলা',
                'জেলা',
                'শহর',
                'গ্রাম',
                'বাসা',
                'বাড়ি',
                'at',
                'in',
                'near',
                'location',
                'hospital'
            ];
            $isLoc = false;
            foreach ($locationKeywords as $kw) {
                if (mb_stripos($maybe, $kw) !== false) {
                    $isLoc = true;
                    break;
                }
            }
            if (!$isLoc && mb_strlen($maybe) < 30) {
                $extractedName = $maybe;
            }
        }

        // ========================================
        // BLOOD GROUP extraction (English + Bangla)
        // ========================================

        // English notation: A+, A-, B+, B-, AB+, AB-, O+, O-
        if (preg_match('/\b(A[+-]|B[+-]|AB[+-]|O[+-])(?![A-Za-z])/i', $transcript, $m)) {
            $extractedBG = strtoupper($m[1]);
        }

        // Bangla script: এ+, বি-, এবি পজিটিভ, ও নেগেটিভ, etc.
        if (empty($extractedBG) || $extractedBG === $profileBg) {
            $bgPatterns = [
                // "ব্লাড গ্রুপ ও পজিটিভ", "রক্তের গ্রুপ বি নেগেটিভ"
                '/(?:ব্লাড|রক্তের?|গ্রুপ)?\s*গ্রুপ\s+(এ|বি|এবি|ও)\s+(পজিটিভ|নেগেটিভ)/u',
                // "ও পজিটিভ রক্ত", "এ নেগেটিভ ব্লাড", "ও+ লাগবে"
                '/(এ|বি|এবি|ও)\s*(পজিটিভ|নেগেটিভ|[+\-])/u',
            ];
            $bgMap = [
                'এ' => 'A',
                'বি' => 'B',
                'এবি' => 'AB',
                'ও' => 'O',
                'পজিটив' => '+',
                'নেগেটিভ' => '-',
                '+' => '+',
                '-' => '-'
            ];
            foreach ($bgPatterns as $pat) {
                if (preg_match($pat, $transcript, $m)) {
                    // figure out which capture group has letter and sign
                    $letter = $bgMap[$m[1]] ?? '';
                    $sign   = $bgMap[$m[2]] ?? ($m[2] === '+' ? '+' : ($m[2] === '-' ? '-' : ''));
                    if (mb_strpos($m[2], 'নে') === 0) $sign = '-';
                    if ($letter && $sign) {
                        $extractedBG = $letter . $sign;
                        break;
                    }
                }
            }
        }

        // ========================================
        // LOCATION extraction (English + Bangla)
        // ========================================

        // English: "at X", "in X", "near X", "location: X"
        if (!$extractedLocation && preg_match('/\b(?:location|at|in|near)\s*(?::)?\s*(.+?)(?:\.|,|$)/i', $transcript, $m)) {
            $extractedLocation = trim($m[1]);
        }
        if (!$extractedLocation && preg_match('/hospital\s*(?::)?\s*(.+?)(?:\.|,|$)/i', $transcript, $m)) {
            $extractedLocation = trim($m[1]);
        }

        // Bangla: "ঠিকানা: X", "ঠিকানা X", "অবস্থান: X", "অবস্থান X"
        if (!$extractedLocation && preg_match('/(?:ঠিকানা|অবস্থান)\s*(?::|ঃ)?\s*(.+?)(?:\.|,|$)/u', $transcript, $m)) {
            $extractedLocation = trim($m[1]);
        }

        // Bangla: "এখানে: X", "এখানে X"
        if (!$extractedLocation && preg_match('/এখানে\s*(?::|ঃ)?\s*(.+?)(?:\.|,|$)/u', $transcript, $m)) {
            $extractedLocation = trim($m[1]);
        }

        // Bangla: "হাসপাতালের নাম X", "হাসপাতাল X"
        if (!$extractedLocation && preg_match('/হাসপাতালের?\s*নাম\s+(.+?)(?:\.|,|$)/u', $transcript, $m)) {
            $extractedLocation = trim($m[1]);
        }

        // Bangla: "আমি X[ে/তে] আছি", "আমি X[ে/তে] ভর্তি আছি", "আমি X[ে/তে] চিকিৎসাধীন"
        if (
            !$extractedLocation &&
            preg_match(
                '/(?<=আমি\s)(.+?)\s*(?:[এে]|তে|থেকে)\s*(?:আছি|ভর্তি\s*আছি|চিকিৎসাধীন|রয়েছে)/u',
                $transcript,
                $m
            )
        ) {
            $extractedLocation = trim($m[1]);
        }

        // Bangla: "X হাসপাতালে", "X হাসপাতালে আছি", "X মেডিকেলে", "X ক্লিনিকে"
        // Requires a comma/bisrg before location to avoid capturing pronouns as location
        if (
            !$extractedLocation &&
            preg_match('/(?:,|।)\s*(?!(?:আমি|আমার|সে|তিনি|তারা|আপনি)\s)([^,]+?)\s*(?:হাসপাতালে|মেডিকেলে|ক্লিনিকে)\s*(?:আছি|ভর্তি)?/u', $transcript, $m)
        ) {
            $maybe = trim($m[1]);
            if (mb_strlen($maybe) < 50 && !preg_match('/^[০-৯+\-]/u', $maybe)) {
                if (preg_match('/\s/', $maybe)) {
                    $extractedLocation = $maybe . (preg_match('/হাসপাতাল/', $m[0]) ? ' হাসপাতাল' : ' মেডিকেল');
                } else {
                    $extractedLocation = $maybe;
                }
            }
        }

        // Fallback আছি: last comma-clause before "X[ে/তে] আছি" (no "আমি " prefix needed)
        if (
            !$extractedLocation &&
            preg_match('/(?:,|^)\s*([^,]+?)\s*(?:[এে]|তে|থেকে)\s*আছি/u', $transcript, $m)
        ) {
            $extractedLocation = trim($m[1]);
        }

        // Last resort: medical facility name as location indicator
        if (
            !$extractedLocation &&
            preg_match('/(?:,|^)\s*([^,]*?(?:মেডিকেল(?:\s*কলেজ)?|হাসপাতাল|ক্লিনিক)[^,]*)(?:,|$)/u', $transcript, $m)
        ) {
            $loc = trim($m[1]);
            $loc = preg_replace('/[েে]\s*(?:ভর্তি)?\s*$/u', '', $loc);
            $loc = preg_replace('/তে\s*(?:ভর্তি)?\s*$/u', '', $loc);
            $extractedLocation = trim($loc);
        }

        // Clean up trailing location suffixes: ে, ে, েতে, য়, and context words
        if ($extractedLocation) {
            $extractedLocation = preg_replace('/\s*(?:এতে|েতে?|ভর্তি|আছি|চিকিৎসাধীন|রয়েছে|থাকা)\s*$/u', '', $extractedLocation);
            $extractedLocation = preg_replace('/[েে]$/u', '', $extractedLocation);
            $extractedLocation = preg_replace('/তে$/u', '', $extractedLocation);
            $extractedLocation = preg_replace('/য়$/u', '', $extractedLocation);
            $extractedLocation = trim($extractedLocation);
        }
    }

    // Call the stored procedure — inserts request, notifies matching donors
    /* Insert emergency request directly (replaces sp_process_emergency_request) */
    $bbParam = $bloodBankId > 0 ? $bloodBankId : null;
    $ins = $conn->prepare("
        INSERT INTO emergency_request
            (requester_user_id, voice_transcript, extracted_name, extracted_blood_group,
             extracted_location, requester_phone, required_units, blood_bank_id,
             status, processed_by_ai, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, NOW())
    ");
    $ins->bind_param(
        'isssssii',
        $uid,
        $transcript,
        $extractedName,
        $extractedBG,
        $extractedLocation,
        $phone,
        $requiredUnits,
        $bbParam
    );
    $ins->execute();
    $emergencyId = $ins->insert_id;
    $ins->close();

    /* Notify matching donors by blood group */
    $donorsMatched = 0;
    if ($emergencyId && $extractedBG) {
        $bg = $conn->real_escape_string($extractedBG);
        $donors = $conn->query("
            SELECT user_id FROM donor_recipient
            WHERE blood_group = '$bg'
              AND is_available = 1
            LIMIT 50
        ");
        if ($donors) {
            while ($d = $donors->fetch_assoc()) {
                $did = (int)$d['user_id'];
                $conn->query("INSERT INTO notification (user_id, title, message)
                    VALUES ($did, '🚨 Emergency Blood Request',
                    'An emergency request for $bg blood has been raised. Please respond if you can donate.')");
                $donorsMatched++;
            }
        }
        if ($donorsMatched > 0) {
            $conn->query("UPDATE emergency_request SET matched_donor_count=$donorsMatched WHERE id=$emergencyId");
        }
    }

    jsonResponse([
        'success'        => true,
        'message'        => "🚨 Emergency request dispatched! $donorsMatched nearby donor(s) notified.",
        'emergency_id'   => $emergencyId,
        'donors_notified' => (int)$donorsMatched,
        'blood_group'    => $extractedBG,
        'requester_phone' => $phone,
    ]);
}

/* ══════════════════════════════════════════════════════════
   HOSPITALS (for dropdowns)
══════════════════════════════════════════════════════════ */
function handleHospitals()
{
    global $conn;
    $result = $conn->query("SELECT id, name, city FROM hospital ORDER BY name");
    jsonResponse(['success' => true, 'hospitals' => $result ? $result->fetch_all(MYSQLI_ASSOC) : []]);
}

/* ══════════════════════════════════════════════════════════
   NOTIFICATION PREFERENCES (A.1.5)
══════════════════════════════════════════════════════════ */
function handleSaveNotificationPreferences()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $email = isset($data['email']) ? (int)(bool)$data['email'] : 1;
    $sms   = isset($data['sms'])   ? (int)(bool)$data['sms']   : 1;
    $push  = isset($data['push'])  ? (int)(bool)$data['push']  : 1;

    // Ensure the preferences table exists
    $conn->query("CREATE TABLE IF NOT EXISTS notification_preference (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        email_enabled TINYINT(1) DEFAULT 1,
        sms_enabled TINYINT(1) DEFAULT 1,
        push_enabled TINYINT(1) DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $stmt = $conn->prepare("
        INSERT INTO notification_preference (user_id, email_enabled, sms_enabled, push_enabled)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE email_enabled = VALUES(email_enabled), sms_enabled = VALUES(sms_enabled), push_enabled = VALUES(push_enabled)
    ");
    $stmt->bind_param('iiii', $uid, $email, $sms, $push);
    if (!$stmt->execute()) {
        jsonResponse(['success' => false, 'error' => 'Failed to save preferences: ' . $conn->error], 500);
    }
    $stmt->close();

    jsonResponse(['success' => true, 'message' => 'Notification preferences saved.']);
}

/* ══════════════════════════════════════════════════════════
   VERIFY REQUEST HASH (A.2.5)
══════════════════════════════════════════════════════════ */
function handleVerifyRequestHash()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_GET;

    $requestId = (int)($data['request_id'] ?? 0);
    $hash      = trim($data['hash'] ?? '');

    if (!$requestId || !$hash) {
        jsonResponse(['success' => false, 'error' => 'Request ID and hash required.'], 422);
    }

    $stmt = $conn->prepare("
        SELECT id, request_hash, status, blood_group, units_required, requested_at
        FROM blood_request
        WHERE id = ? AND requester_user_id = ?
        LIMIT 1
    ");
    $stmt->bind_param('ii', $requestId, $uid);
    $stmt->execute();
    $req = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$req) {
        jsonResponse(['success' => false, 'error' => 'Request not found.'], 404);
    }

    $valid = ($req['request_hash'] === $hash);

    // Get timeline entries for verification chain
    $stmt = $conn->prepare("
        SELECT id, status, changed_at, remarks, previous_hash, current_hash
        FROM request_timeline
        WHERE request_id = ?
        ORDER BY changed_at ASC
    ");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $timeline = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse([
        'success' => true,
        'valid'   => $valid,
        'request' => $req,
        'timeline_entries' => $timeline,
    ]);
}

/* ══════════════════════════════════════════════════════════
   REQUEST TIMELINE (A.2.6)
══════════════════════════════════════════════════════════ */
function handleRequestTimeline()
{
    global $conn;
    $uid  = requireAuth();

    $requestId = (int)($_GET['request_id'] ?? 0);
    if (!$requestId) {
        jsonResponse(['success' => false, 'error' => 'Request ID required.'], 422);
    }

    // Verify ownership
    $stmt = $conn->prepare("SELECT id FROM blood_request WHERE id = ? AND requester_user_id = ? LIMIT 1");
    $stmt->bind_param('ii', $requestId, $uid);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        jsonResponse(['success' => false, 'error' => 'Request not found or access denied.'], 404);
    }
    $stmt->close();

    $stmt = $conn->prepare("
        SELECT id, status, changed_at, changed_by_user_id, remarks, previous_hash, current_hash
        FROM request_timeline
        WHERE request_id = ?
        ORDER BY changed_at ASC
    ");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $timeline = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse(['success' => true, 'timeline' => $timeline]);
}

/* ══════════════════════════════════════════════════════════
   CHATBOT MESSAGE / RAKTOSATHI (A.4)
   AI functions are now in ai_functions.php (shared)
   ══════════════════════════════════════════════════════════ */

/**
 * Log a chat message to the database for authenticated users.
 */
function logChatMessage($conn, $uid, $sessionId, $message, $sender)
{
    $intent = $sender === 'bot' ? 'ai_response' : 'user_input';
    $stmt = $conn->prepare("INSERT INTO chat_log (user_id, session_id, message, sender, intent_detected) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('issss', $uid, $sessionId, $message, $sender, $intent);
    $stmt->execute();
    $stmt->close();
}

/**
 * Fetch the last N messages from DB for conversation context (auth users).
 */
function getChatContext($conn, $sessionId, $limit = 10)
{
    $stmt = $conn->prepare("SELECT message, sender FROM chat_log WHERE session_id = ? ORDER BY id DESC LIMIT ?");
    $stmt->bind_param('si', $sessionId, $limit);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return array_reverse($rows);
}

function handleChatbotMessage()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $message   = trim($data['message'] ?? '');
    $sessionId = trim($data['session_id'] ?? ('CHAT-' . $uid));
    $loadHistory = !empty($data['load_history']);

    // If client is requesting history load only, return all past messages for this user
    if ($loadHistory) {
        $stmt = $conn->prepare("SELECT message, sender, created_at FROM chat_log WHERE user_id = ? ORDER BY id ASC");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        jsonResponse([
            'success'  => true,
            'history'  => $history,
            'session_id' => $sessionId,
        ]);
    }

    if (!$message) {
        jsonResponse(['success' => false, 'error' => 'Message is required.'], 422);
    }

    // Log user message to database
    logChatMessage($conn, $uid, $sessionId, $message, 'user');

    // Get conversation context (last 10 messages from DB)
    $context = getChatContext($conn, $sessionId, 10);

    // Try AI backends (functions now in ai_functions.php)
    $botResponse = geminiChat($message, $context);

    if (!$botResponse) {
        $botResponse = groqChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = huggingfaceChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = openrouterChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = fallbackChatResponse($message);
    }

    // Log bot response to database
    logChatMessage($conn, $uid, $sessionId, $botResponse, 'bot');

    jsonResponse([
        'success'    => true,
        'response'   => $botResponse,
        'session_id' => $sessionId,
        '_debug'     => $GLOBALS['or_debug'] ?? null,
        '_gemini'    => $GLOBALS['gemini_debug'] ?? null,
        '_hf'        => $GLOBALS['hf_debug'] ?? null,
        '_groq'      => $GLOBALS['groq_debug'] ?? null,
    ]);
}

/* ══════════════════════════════════════════════════════════
   CHECK AVAILABILITY 
══════════════════════════════════════════════════════════ */
function handleCheckAvailability()
{
    global $conn;
    requireAuth();

    $body = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $bg    = trim($body['blood_group']    ?? $_GET['blood_group']    ?? '');
    $units = (int)($body['units_required'] ?? $_GET['units_required'] ?? 1);

    if (!$bg)                              jsonResponse(['success' => false, 'error' => 'blood_group required.'], 422);
    if ($units < 1 || $units > 10)        jsonResponse(['success' => false, 'error' => 'Units must be 1–10.'], 422);

    $stmt = $conn->prepare("
        SELECT bb.id        AS bank_id,
               bb.name      AS bank_name,
               bb.city,
               bb.latitude,
               bb.longitude,
               bb.rating_avg,
               COUNT(bag.id) AS available_units
        FROM blood_bank bb
        LEFT JOIN blood_bag bag
               ON bag.blood_bank_id   = bb.id
              AND bag.blood_group      = ?
              AND bag.status           = 'available'
              AND bag.expiry_date      > CURDATE()
              AND bag.culture_test_status IN ('passed', 'pending')
        WHERE bb.status = 'active'
        GROUP BY bb.id, bb.name, bb.city, bb.latitude, bb.longitude, bb.rating_avg
        HAVING available_units > 0
        ORDER BY available_units DESC, bb.rating_avg DESC
    ");
    $stmt->bind_param('s', $bg);
    $stmt->execute();
    $banks = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    foreach ($banks as &$b) {
        $b['bank_id']        = (int)$b['bank_id'];
        $b['available_units'] = (int)$b['available_units'];
        $b['rating_avg']     = round((float)$b['rating_avg'], 1);
        $b['latitude']       = $b['latitude']  ? (float)$b['latitude']  : null;
        $b['longitude']      = $b['longitude'] ? (float)$b['longitude'] : null;
    }
    unset($b);

    $totalStock = array_sum(array_column($banks, 'available_units'));

    $singleBank = null;
    foreach ($banks as $b) {
        if ($b['available_units'] >= $units) {
            $singleBank = $b;
            break;
        }
    }

    if ($singleBank) {
        jsonResponse([
            'success'        => true,
            'scenario'       => 'single',
            'banks'          => $banks,
            'total_stock'    => $totalStock,
        ]);
    }

    $needed    = $units;
    $allocationPlan = [];
    foreach ($banks as $b) {
        $take = min($b['available_units'], $needed);
        $allocationPlan[] = [
            'bank_id'         => $b['bank_id'],
            'bank_name'       => $b['bank_name'],
            'units_to_take'   => $take,
            'remaining_stock' => $b['available_units'] - $take,
        ];
        $needed -= $take;
        if ($needed <= 0) break;
    }

    jsonResponse([
        'success'        => true,
        'scenario'       => ($needed <= 0) ? 'split' : 'insufficient',
        'banks'          => $banks,
        'total_stock'    => $totalStock,
        'allocation'     => $allocationPlan,
        'shortfall'      => ($needed > 0) ? $needed : 0,
    ]);
}

/* ══════════════════════════════════════════════════════════
   PROMISE SELF-SERVICE 
══════════════════════════════════════════════════════════ */
function handleReschedulePDR()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $promiseId = (int)($data['promise_id'] ?? 0);
    $newDate   = trim($data['new_date']    ?? '');

    if (!$promiseId) jsonResponse(['success' => false, 'error' => 'promise_id required.'], 422);
    if (!$newDate)   jsonResponse(['success' => false, 'error' => 'new_date required.'], 422);

    $ts = strtotime($newDate);
    if (!$ts || $ts <= time()) jsonResponse(['success' => false, 'error' => 'Date must be in the future.'], 422);
    $formatted = date('Y-m-d 09:00:00', $ts);

    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND donor_user_id=? AND status='pending' LIMIT 1");
    $chk->bind_param('ii', $promiseId, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Promise not found or already fulfilled.'], 404);
    $chk->close();

    $stmt = $conn->prepare("UPDATE donation_promise SET promise_time=? WHERE id=? AND donor_user_id=?");
    $stmt->bind_param('sii', $formatted, $promiseId, $uid);
    if (!$stmt->execute()) jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    $stmt->close();

    jsonResponse(['success' => true, 'message' => 'Promise rescheduled successfully.']);
}

function handleCancelPromiseDR()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $promiseId = (int)($data['promise_id'] ?? 0);
    if (!$promiseId) jsonResponse(['success' => false, 'error' => 'promise_id required.'], 422);

    $chk = $conn->prepare("SELECT id FROM donation_promise WHERE id=? AND donor_user_id=? AND status='pending' LIMIT 1");
    $chk->bind_param('ii', $promiseId, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Promise not found or already processed.'], 404);
    $chk->close();

    $stmt = $conn->prepare("UPDATE donation_promise SET status='cancelled' WHERE id=? AND donor_user_id=?");
    $stmt->bind_param('ii', $promiseId, $uid);
    if (!$stmt->execute()) jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    $stmt->close();

    $deduct = 5;
    $ts = $conn->prepare("UPDATE donor_recipient SET trust_score = GREATEST(trust_score - ?, 0) WHERE user_id = ?");
    $ts->bind_param('ii', $deduct, $uid);
    $ts->execute();
    $ts->close();

    $tq = $conn->prepare("SELECT trust_score FROM donor_recipient WHERE user_id = ? LIMIT 1");
    $tq->bind_param('i', $uid);
    $tq->execute();
    $newTrust = (int)($tq->get_result()->fetch_assoc()['trust_score'] ?? 0);
    $tq->close();

    jsonResponse(['success' => true, 'message' => 'Promise cancelled. Trust score reduced by ' . $deduct . ' points.', 'trust_score' => $newTrust, 'deducted' => $deduct]);
}

/* ══════════════════════════════════════════════════════════
   ADMIN WARNING HANDLERS 
══════════════════════════════════════════════════════════ */
function _twExistsDR($t)
{
    global $conn;
    $r = $conn->query("SHOW TABLES LIKE '" . $conn->real_escape_string($t) . "'");
    return $r && $r->num_rows > 0;
}
function _cwExistsDR($t, $c)
{
    global $conn;
    $r = $conn->query("SHOW COLUMNS FROM `" . str_replace('`', '', $t) . "` LIKE '" . $conn->real_escape_string($c) . "'");
    return $r && $r->num_rows > 0;
}

function handleGetWarningsDR()
{
    global $conn;
    $uid = requireAuth();
    if (!_twExistsDR('admin_warning')) jsonResponse(['success' => true, 'warnings' => [], 'warning_count' => 0]);
    $dimSql = _cwExistsDR('admin_warning', 'is_dismissed') ? "AND (is_dismissed=0 OR is_dismissed IS NULL)" : "";
    $planCol = _cwExistsDR('admin_warning', 'admin_improvement_plan') ? ',admin_improvement_plan' : '';
    $stmt = $conn->prepare("SELECT id,message,status,sent_at,response,responded_at{$planCol} FROM admin_warning WHERE target_type='user' AND target_id=? AND status NOT IN ('blocked','cool_down') $dimSql ORDER BY sent_at DESC");
    if (!$stmt) jsonResponse(['success' => false, 'error' => $conn->error], 500);
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $warnings = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    jsonResponse(['success' => true, 'warnings' => $warnings, 'warning_count' => count($warnings)]);
}

function handleAcknowledgeWarningDR()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $wid  = (int)($data['warning_id'] ?? 0);
    if (!$wid) jsonResponse(['success' => false, 'error' => 'warning_id required.'], 422);
    $chk = $conn->prepare("SELECT id FROM admin_warning WHERE id=? AND target_type='user' AND target_id=? LIMIT 1");
    $chk->bind_param('ii', $wid, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Warning not found.'], 404);
    $chk->close();
    $now = date('Y-m-d H:i:s');
    if (_cwExistsDR('admin_warning', 'is_dismissed')) {
        $s = $conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=?,is_dismissed=1,action_taken='acknowledged' WHERE id=?");
        $s->bind_param('si', $now, $wid);
    } else {
        $s = $conn->prepare("UPDATE admin_warning SET status='acknowledged',response='accepted',responded_at=? WHERE id=?");
        $s->bind_param('si', $now, $wid);
    }
    $s->execute();
    $s->close();
    jsonResponse(['success' => true, 'message' => 'Warning acknowledged.']);
}

function handleSubmitImprovementDR()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $wid  = (int)($data['warning_id'] ?? 0);
    $plan = trim($data['plan'] ?? '');
    if (!$wid)            jsonResponse(['success' => false, 'error' => 'warning_id required.'], 422);
    if (strlen($plan) < 10) jsonResponse(['success' => false, 'error' => 'Min 10 characters required.'], 422);
    $chk = $conn->prepare("SELECT id FROM admin_warning WHERE id=? AND target_type='user' AND target_id=? LIMIT 1");
    $chk->bind_param('ii', $wid, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Warning not found.'], 404);
    $chk->close();
    $now = date('Y-m-d H:i:s');
    if (_cwExistsDR('admin_warning', 'improvement_plan')) {
        $s = $conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=?,is_dismissed=1,action_taken='improvement_submitted',improvement_plan=? WHERE id=?");
        $s->bind_param('ssi', $now, $plan, $wid);
    } else {
        $s = $conn->prepare("UPDATE admin_warning SET status='improvement_submitted',response='accepted',responded_at=? WHERE id=?");
        $s->bind_param('si', $now, $wid);
    }
    $s->execute();
    $s->close();
    jsonResponse(['success' => true, 'message' => 'Response submitted.']);
}

function handleAppealWarningDR()
{
    global $conn;
    $uid    = requireAuth();
    $data   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $wid    = (int)($data['warning_id'] ?? 0);
    $reason = trim($data['reason'] ?? '');
    if (!$wid)              jsonResponse(['success' => false, 'error' => 'warning_id required.'], 422);
    if (strlen($reason) < 10) jsonResponse(['success' => false, 'error' => 'Min 10 characters required.'], 422);
    $chk = $conn->prepare("SELECT id FROM admin_warning WHERE id=? AND target_type='user' AND target_id=? LIMIT 1");
    $chk->bind_param('ii', $wid, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Warning not found.'], 404);
    $chk->close();
    $now = date('Y-m-d H:i:s');
    if (_cwExistsDR('admin_warning', 'appeal_reason')) {
        $s = $conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=?,is_dismissed=1,action_taken='appealed',appeal_reason=? WHERE id=?");
        $s->bind_param('ssi', $now, $reason, $wid);
    } else {
        $s = $conn->prepare("UPDATE admin_warning SET status='appealed',response='rejected',responded_at=? WHERE id=?");
        $s->bind_param('si', $now, $wid);
    }
    $s->execute();
    $s->close();
    jsonResponse(['success' => true, 'message' => 'Appeal submitted.']);
}

/* ══════════════════════════════════════════════════════════
   MY VOICE REQUESTS
══════════════════════════════════════════════════════════ */
function handleMyVoiceRequests()
{
    global $conn;
    $uid = requireAuth();

    $res = $conn->prepare("SELECT id, extracted_blood_group AS blood_group, extracted_name AS requester_name, extracted_location AS location, requester_phone AS phone, voice_transcript, status, matched_donor_count, created_at AS requested_at FROM emergency_request WHERE requester_user_id = ? ORDER BY created_at DESC LIMIT 50");
    $res->bind_param('i', $uid);
    $res->execute();
    $result = $res->get_result();
    $requests = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
    $res->close();
    jsonResponse(['success' => true, 'requests' => $requests]);
}

/* ══════════════════════════════════════════════════════════
   PARTNER LINKING
   ── link_partner:  send request by partner email
   ── confirm_partner: accept pending partner request
   ── unlink_partner:  remove partner link
   ── partner_status:  get current link info
   ══════════════════════════════════════════════════════════ */
function handleLinkPartner()
{
    global $conn;
    $uid = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $email = trim($data['partner_email'] ?? '');

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'Please enter a valid email address.'], 422);
    }

    // Prevent self-link
    $myEmail = $_SESSION['user_email'] ?? '';
    if (strtolower($email) === strtolower($myEmail)) {
        jsonResponse(['success' => false, 'error' => 'You cannot link yourself as a partner.'], 422);
    }

    // Find target user
    $stmt = $conn->prepare("SELECT id, full_name FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $target = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$target) {
        jsonResponse(['success' => false, 'error' => 'No account found with this email address.'], 404);
    }

    $targetId = (int)$target['id'];

    // Check if already linked
    $stmt = $conn->prepare("
        SELECT id, status FROM partner_links
        WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
        LIMIT 1
    ");
    $stmt->bind_param('iiii', $uid, $targetId, $targetId, $uid);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($existing) {
        if ($existing['status'] === 'active') {
            jsonResponse(['success' => false, 'error' => 'You are already linked with this person.'], 409);
        }
        if ($existing['status'] === 'pending') {
            jsonResponse(['success' => false, 'error' => 'A partner request is already pending. Please wait for confirmation.'], 409);
        }
        // If rejected, allow resend by updating
        $stmt = $conn->prepare("UPDATE partner_links SET status = 'pending', action_user = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param('ii', $uid, $existing['id']);
        $stmt->execute();
        $stmt->close();
        jsonResponse(['success' => true, 'message' => 'Partner request resent.']);
    }

    // Check if user already has an active link
    $stmt = $conn->prepare("
        SELECT id FROM partner_links
        WHERE status = 'active' AND (? IN (user_id_1, user_id_2))
        LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        jsonResponse(['success' => false, 'error' => 'You are already linked to another partner. Please unlink first.'], 409);
    }
    $stmt->close();

    // Check if target already has an active link
    $stmt = $conn->prepare("
        SELECT id FROM partner_links
        WHERE status = 'active' AND (? IN (user_id_1, user_id_2))
        LIMIT 1
    ");
    $stmt->bind_param('i', $targetId);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        jsonResponse(['success' => false, 'error' => 'This person is already linked to another account.'], 409);
    }
    $stmt->close();

    // Normalize: store lower ID first
    $id1 = min($uid, $targetId);
    $id2 = max($uid, $targetId);

    $stmt = $conn->prepare("
        INSERT INTO partner_links (user_id_1, user_id_2, status, action_user)
        VALUES (?, ?, 'pending', ?)
    ");
    $stmt->bind_param('iii', $id1, $id2, $uid);
    if (!$stmt->execute()) {
        jsonResponse(['success' => false, 'error' => 'Failed to create partner link: ' . $conn->error], 500);
    }
    $stmt->close();

    // Notify the target
    $myName = $_SESSION['user_name'] ?? 'Someone';
    $notifTitle = '💍 Partner Request';
    $notifMsg = "{$myName} has sent you a partner request. Please confirm or reject it from your profile settings.";
    $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->bind_param('iss', $targetId, $notifTitle, $notifMsg);
    $stmt->execute();
    $stmt->close();

    jsonResponse(['success' => true, 'message' => "Partner request sent to {$target['full_name']}."]);
}

function handleConfirmPartner()
{
    global $conn;
    $uid = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $linkId = (int)($data['link_id'] ?? 0);
    $action = $data['action'] ?? 'confirm'; // confirm | reject

    if (!$linkId) {
        jsonResponse(['success' => false, 'error' => 'Link ID required.'], 422);
    }

    // Must be the target user (user_id_2 or user_id_1, but not the requester)
    $stmt = $conn->prepare("
        SELECT id, user_id_1, user_id_2, action_user FROM partner_links
        WHERE id = ? AND status = 'pending' AND ? IN (user_id_1, user_id_2)
        LIMIT 1
    ");
    $stmt->bind_param('ii', $linkId, $uid);
    $stmt->execute();
    $link = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$link) {
        jsonResponse(['success' => false, 'error' => 'Pending request not found.'], 404);
    }

    if ((int)$link['action_user'] === $uid) {
        jsonResponse(['success' => false, 'error' => 'You cannot confirm your own request. Ask your partner to confirm.'], 422);
    }

    $id1 = (int)$link['user_id_1'];
    $id2 = (int)$link['user_id_2'];

    if ($action === 'reject') {
        $stmt = $conn->prepare("UPDATE partner_links SET status = 'rejected', action_user = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param('ii', $uid, $linkId);
        $stmt->execute();
        $stmt->close();
        jsonResponse(['success' => true, 'message' => 'Partner request rejected.']);
    }

    // Confirm
    $stmt = $conn->prepare("UPDATE partner_links SET status = 'active', action_user = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param('ii', $uid, $linkId);
    $stmt->execute();
    $stmt->close();

    // Run thalassemia couple check for both users
    try {
        syncThalassemiaCoupleAlert($id1);
        syncThalassemiaCoupleAlert($id2);
    } catch (\Throwable $e) { /* table may not exist yet */
    }

    // Notify the requester
    $myName = $_SESSION['user_name'] ?? 'Your partner';
    $notifTitle = '✅ Partner Linked';
    $notifMsg = "{$myName} has confirmed your partner request. You are now linked!";
    $otherId = ($id1 === $uid) ? $id2 : $id1;
    $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->bind_param('iss', $otherId, $notifTitle, $notifMsg);
    $stmt->execute();
    $stmt->close();

    jsonResponse(['success' => true, 'message' => 'Partner confirmed! You are now linked.']);
}

function handleUnlinkPartner()
{
    global $conn;
    $uid = requireAuth();

    // Find link (active or pending) where current user is involved
    $stmt = $conn->prepare("
        SELECT id, user_id_1, user_id_2, status, action_user FROM partner_links
        WHERE status IN ('active', 'pending') AND (? IN (user_id_1, user_id_2))
        LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $link = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$link) {
        jsonResponse(['success' => false, 'error' => 'No active or pending partner link found.'], 404);
    }

    $id1 = (int)$link['user_id_1'];
    $id2 = (int)$link['user_id_2'];
    $status = $link['status'];
    $actionUser = (int)($link['action_user'] ?? 0);

    // If pending, only the requester (action_user) can cancel
    if ($status === 'pending' && $actionUser !== $uid) {
        jsonResponse(['success' => false, 'error' => 'You cannot cancel this request. Use Reject instead.'], 422);
    }

    // Delete the link
    $stmt = $conn->prepare("DELETE FROM partner_links WHERE id = ?");
    $stmt->bind_param('i', $link['id']);
    $stmt->execute();
    $stmt->close();

    // Remove any couple alert (only relevant for active links)
    try {
        syncThalassemiaCoupleAlert($uid);
    } catch (\Throwable $e) { /* table may not exist yet */
    }

    // Notify the other partner (only for active links)
    if ($status === 'active') {
        $otherId = ($id1 === $uid) ? $id2 : $id1;
        $myName = $_SESSION['user_name'] ?? 'Your partner';
        $notifTitle = '💔 Partner Unlinked';
        $notifMsg = "{$myName} has unlinked from you.";
        $stmt = $conn->prepare("INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)");
        $stmt->bind_param('iss', $otherId, $notifTitle, $notifMsg);
        $stmt->execute();
        $stmt->close();
    }

    $message = ($status === 'active') ? 'Partner unlinked successfully.' : 'Partner request cancelled.';
    jsonResponse(['success' => true, 'message' => $message]);
}

function handlePartnerStatus()
{
    global $conn;
    $uid = requireAuth();

    $stmt = $conn->prepare("
        SELECT pl.id, pl.status,
               CASE WHEN pl.user_id_1 = ? THEN pl.user_id_2 ELSE pl.user_id_1 END AS partner_id,
               u.full_name AS partner_name, u.email AS partner_email,
               pl.created_at AS requested_at, pl.updated_at
        FROM partner_links pl
        LEFT JOIN users u ON u.id = CASE WHEN pl.user_id_1 = ? THEN pl.user_id_2 ELSE pl.user_id_1 END
        WHERE ? IN (pl.user_id_1, pl.user_id_2)
        ORDER BY pl.created_at DESC LIMIT 1
    ");
    $stmt->bind_param('iii', $uid, $uid, $uid);
    $stmt->execute();
    $link = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$link) {
        jsonResponse(['success' => true, 'partner' => null]);
    }

    jsonResponse(['success' => true, 'partner' => $link]);
}
/* ================================================================
   MY BLOOD BAGS — requester sees approved blood bags for requests
   Shows bags where lab tech approved the donor's culture test
================================================================ */
function handleMyBloodBags()
{
    global $conn;
    $uid       = requireAuth();
    $requestId = (int)($_GET['request_id'] ?? 0);

    if (!$requestId) {
        jsonResponse(['success' => false, 'error' => 'request_id required.'], 422);
    }

    /* Verify this request belongs to the logged-in user */
    $chk = $conn->prepare("SELECT id FROM blood_request WHERE id=? AND requester_user_id=? LIMIT 1");
    $chk->bind_param('ii', $requestId, $uid);
    $chk->execute();
    if (!$chk->get_result()->fetch_assoc()) {
        jsonResponse(['success' => false, 'error' => 'Request not found.'], 404);
    }
    $chk->close();

    /* Get approved culture tests for this request */
    $stmt = $conn->prepare("
        SELECT
            bct.id           AS test_id,
            bct.result       AS test_result,
            bct.comments     AS test_comments,
            bct.test_date,
            bct.status       AS culture_status,
            bct.donor_user_id,
            bct.donor_price,
            bct.price_accepted,
            u.full_name      AS donor_name,
            bb.id            AS bag_id,
            bb.bag_barcode,
            bb.blood_group,
            bb.volume_ml,
            bb.expiry_date,
            bb.status        AS bag_status,
            bb.created_at    AS bag_created
        FROM blood_culture_test bct
        INNER JOIN users u       ON u.id  = bct.donor_user_id
        LEFT JOIN  blood_bag bb  ON bb.id = bct.blood_bag_id
        WHERE bct.request_id = ?
          AND (
              bct.status = 'approved'
              OR bb.status = 'used'
          )
        ORDER BY CASE WHEN bb.status = 'used' THEN 0 ELSE 1 END, bct.test_date DESC
    ");
    $stmt->bind_param('i', $requestId);
    $stmt->execute();
    $bags = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    /* Also return units progress so JS can show the counter */
    $reqInfo = $conn->query("SELECT units_required, units_fulfilled FROM blood_request WHERE id=$requestId LIMIT 1");
    $reqMeta = $reqInfo ? $reqInfo->fetch_assoc() : [];
    $unitsRequired  = (int)($reqMeta['units_required']  ?? 1);
    $unitsFulfilled = (int)($reqMeta['units_fulfilled'] ?? 0);

    /* ── Bank offers from approval_step ── */
    $bofStmt = $conn->prepare("
        SELECT
            ast.id              AS offer_id,
            ast.approver_user_id AS bank_user_id,
            ast.status          AS offer_status,
            ast.comments        AS offer_notes,
            ast.price_per_unit  AS bank_price_per_unit,
            ast.total_units     AS bank_offer_units,
            ast.created_at      AS offered_at,
            bb.id               AS bank_id,
            bb.name             AS bank_name,
            bb.city             AS bank_city,
            bb.phone            AS bank_phone,
            bb.role             AS bank_role,
            /* Count available stock from this bank for this blood group */
            (SELECT COUNT(*) FROM blood_bag bg
             WHERE bg.blood_bank_id = bb.id
               AND bg.blood_group = br.blood_group
               AND bg.status = 'available'
               AND bg.expiry_date > CURDATE()) AS units_available
        FROM approval_step ast
        INNER JOIN blood_bank bb ON bb.id = ast.approver_user_id
        INNER JOIN blood_request br ON br.id = ast.entity_id
        WHERE ast.entity_id = ?
          AND ast.entity_type = 'blood_request'
          AND ast.status IN ('pending', 'approved', 'rejected')
        ORDER BY CASE ast.status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, ast.created_at ASC
    ");
    $bofStmt->bind_param('i', $requestId);
    $bofStmt->execute();
    $bankOffers = $bofStmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $bofStmt->close();

    /* Get request_type, payment_status, and current status for this request */
    $rtRow = $conn->query("SELECT request_type, payment_status, status FROM blood_request WHERE id=$requestId LIMIT 1");
    $rtMeta = $rtRow ? $rtRow->fetch_assoc() : [];
    $requestType   = $rtMeta['request_type'] ?? 'free';
    $paymentStatus = $rtMeta['payment_status'] ?? 'not_required';
    $reqCurrentStatus = $rtMeta['status'] ?? '';

    jsonResponse([
        'success'         => true,
        'bags'            => $bags,
        'bank_offers'     => $bankOffers,
        'request_id'      => $requestId,
        'units_required'  => $unitsRequired,
        'units_fulfilled' => $unitsFulfilled,
        'request_type'    => $requestType,
        'payment_status'  => $paymentStatus,
        'status'          => $reqCurrentStatus,
    ]);
}

/* ================================================================
   ACCEPT BLOOD BAG - requester picks a donor blood bag
================================================================ */
function handleAcceptBloodBag()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $bagId     = (int)($data['bag_id']     ?? 0);
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$bagId || !$requestId) jsonResponse(['success' => false, 'error' => 'bag_id and request_id required.'], 422);

    /* Verify request belongs to this user and is still pending */
    $chk = $conn->query("SELECT id FROM blood_request WHERE id=$requestId AND requester_user_id=$uid AND status='pending' LIMIT 1");
    if (!$chk || !$chk->fetch_assoc()) jsonResponse(['success' => false, 'error' => 'Request not found or already fulfilled.'], 404);

    /* Get donor from culture test linked to this bag */
    $tRow = $conn->query("SELECT bct.donor_user_id FROM blood_culture_test bct WHERE bct.blood_bag_id=$bagId AND bct.request_id=$requestId AND bct.status='approved' LIMIT 1");
    if (!$tRow || !($test = $tRow->fetch_assoc())) jsonResponse(['success' => false, 'error' => 'Blood bag not found for this request.'], 404);
    $donorUid = (int)$test['donor_user_id'];

    /* Get requester name */
    $nRow = $conn->query("SELECT full_name FROM users WHERE id=$uid LIMIT 1");
    $requesterName = ($nRow && ($nr = $nRow->fetch_assoc())) ? $nr['full_name'] : 'The requester';
    $rName = $conn->real_escape_string($requesterName);

    /* Mark blood bag as used */
    $conn->query("UPDATE blood_bag SET status='used' WHERE id=$bagId");

    /* Increment units_fulfilled by 1 */
    $conn->query("UPDATE blood_request SET units_fulfilled = units_fulfilled + 1 WHERE id=$requestId");

    /* Re-read to check if all units are now fulfilled */
    $reqRow = $conn->query("SELECT units_required, units_fulfilled FROM blood_request WHERE id=$requestId LIMIT 1");
    $reqData = $reqRow ? $reqRow->fetch_assoc() : null;
    $unitsRequired  = (int)($reqData['units_required']  ?? 1);
    $unitsFulfilled = (int)($reqData['units_fulfilled'] ?? 1);
    $fullyFulfilled = ($unitsFulfilled >= $unitsRequired);

    if ($fullyFulfilled) {
        /* All units collected — close the request */
        $conn->query("UPDATE blood_request SET status='approved', approved_by_user_id=$donorUid, approved_at=NOW() WHERE id=$requestId");

        /* Reject remaining OTHER approved culture tests — but NEVER ones
           whose bag is already 'used' (already accepted by requester) */
        $conn->query("
            UPDATE blood_culture_test bct
            LEFT JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            SET bct.status = 'rejected', bct.comments = 'Request fully fulfilled by other donors.'
            WHERE bct.request_id = $requestId
              AND bct.status = 'approved'
              AND bct.blood_bag_id != $bagId
              AND (bb.status IS NULL OR bb.status != 'used')
        ");
    }
    /* If not fully fulfilled yet — keep status='pending', keep other donors available */

    /* ----------------------------------------------------------------
       Record the donation in donation_promise so it appears in the
       donor's Complete Donation History immediately.

       Logic:
         1. If donor already has a pending promise → mark it fulfilled.
         2. If no promise exists (donor responded directly) → create a
            new donation_promise row with status='fulfilled' so the
            history query picks it up without touching the donation table
            (which has a broken trigger).
    ---------------------------------------------------------------- */

    /* Get blood_bank_id from the request (may be NULL for direct donations) */
    $bbRow       = $conn->query("SELECT blood_bank_id FROM blood_request WHERE id=$requestId LIMIT 1");
    $bloodBankId = ($bbRow && ($bb = $bbRow->fetch_assoc())) ? (int)($bb['blood_bank_id'] ?? 0) : 0;
    $bbVal       = $bloodBankId > 0 ? $bloodBankId : 'NULL';

    /* Check for an existing pending promise for this donor */
    $dpRow = $conn->query("
        SELECT id FROM donation_promise
        WHERE donor_user_id = $donorUid
          AND status = 'pending'
        ORDER BY promise_time DESC
        LIMIT 1
    ");

    if ($dpRow && ($dp = $dpRow->fetch_assoc())) {
        /* ── Case 1: Promise exists → mark it fulfilled ── */
        $donationPromiseId = (int)$dp['id'];
        $conn->query("
            UPDATE donation_promise
            SET status      = 'fulfilled',
                fulfilled_at = NOW(),
                blood_bank_id = COALESCE(blood_bank_id, $bbVal)
            WHERE id = $donationPromiseId
        ");
    } else {
        /* ── Case 2: No promise → INSERT a fulfilled one directly ──
           Always provide confirmation_code so the trigger's
           fn_generate_code() is never called (avoids missing function error) */
        $code = strtoupper(bin2hex(random_bytes(6)));

        /* Duplicate guard — don't insert twice for same request */
        $dupChk = $conn->query("
            SELECT id FROM donation_promise
            WHERE donor_user_id = $donorUid
              AND status = 'fulfilled'
              AND DATE(fulfilled_at) = CURDATE()
              AND blood_bank_id " . ($bloodBankId > 0 ? "= $bloodBankId" : "IS NULL") . "
            LIMIT 1
        ");

        if (!$dupChk || !$dupChk->fetch_assoc()) {
            $conn->query("
                INSERT INTO donation_promise
                    (donor_user_id, blood_bank_id, promise_time, confirmation_code, status, fulfilled_at)
                VALUES
                    ($donorUid, $bbVal, NOW(), '$code', 'fulfilled', NOW())
            ");
        }
    }

    /* Update donor stats */
    $conn->query("
        UPDATE donor_recipient
        SET last_donation_date = CURDATE(),
            total_donations    = COALESCE(total_donations, 0) + 1
        WHERE user_id = $donorUid
    ");

    /* Notify chosen donor */
    $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);
    $conn->query("INSERT INTO notification (user_id,title,message) VALUES ($donorUid,'Blood Accepted','Your blood donation for request #REQ-$reqNo was accepted by $rName. Thank you for saving a life!')");

    /* Notify other donors not selected — only when request is fully fulfilled */
    if ($fullyFulfilled) {
        $others = $conn->query("SELECT DISTINCT donor_user_id FROM blood_culture_test WHERE request_id=$requestId AND donor_user_id != $donorUid AND status='rejected'");
        if ($others) {
            while ($od = $others->fetch_assoc()) {
                $oid = (int)$od['donor_user_id'];
                $conn->query("INSERT INTO notification (user_id,title,message) VALUES ($oid,'Offer Not Selected','Thank you for offering to donate for request #REQ-$reqNo. The requester has fulfilled all units needed. Your generosity is appreciated!')");
            }
        }
    }

    $unitsLeft = max(0, $unitsRequired - $unitsFulfilled);
    if ($fullyFulfilled) {
        $msg = 'Blood bag accepted! All ' . $unitsRequired . ' unit' . ($unitsRequired > 1 ? 's' : '') . ' collected. Your request is now fulfilled.';
    } else {
        $msg = 'Blood bag accepted! ' . $unitsFulfilled . ' of ' . $unitsRequired . ' unit' . ($unitsRequired > 1 ? 's' : '') . ' collected. ' . $unitsLeft . ' more needed.';
    }

    jsonResponse([
        'success'          => true,
        'message'          => $msg,
        'request_id'       => $requestId,
        'units_required'   => $unitsRequired,
        'units_fulfilled'  => $unitsFulfilled,
        'fully_fulfilled'  => $fullyFulfilled,
    ]);
}
/* ================================================================
   MISSING FUNCTION BODIES — added to match switch cases
================================================================ */

/* ── respond_request: donor offers to respond to a blood request ── */
function handleRespondRequest()
{
    /* Alias — same logic as accept_request */
    handleAcceptRequest();
}

/* ================================================================
   ACCEPT BANK OFFER — requester selects a blood bank's offer
   Works exactly like accepting a donor blood bag:
   - Marks this offer as 'approved'
   - Increments units_fulfilled
   - Closes request when all units filled
================================================================ */
function handleAcceptBankOffer()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $offerId   = (int)($data['offer_id']   ?? 0);
    $requestId = (int)($data['request_id'] ?? 0);

    if (!$requestId)
        jsonResponse(['success' => false, 'error' => 'request_id is required.'], 422);

    /* If offer_id is 0 (approval_step has no AUTO_INCREMENT or JS passed 0),
       look up the pending offer for this request automatically. */
    if (!$offerId) {
        $lookupRow = $conn->query("
            SELECT id FROM approval_step
            WHERE entity_type = 'blood_request'
              AND entity_id   = $requestId
              AND status      = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        ");
        $lu = $lookupRow ? $lookupRow->fetch_assoc() : null;
        if ($lu) {
            $offerId = (int)$lu['id'];
        } else {
            jsonResponse(['success' => false, 'error' => 'No pending bank offer found for this request.'], 404);
        }
    }

    /* Verify this request belongs to the requester */
    $reqRow = $conn->query("
        SELECT id, units_required, units_fulfilled, blood_group, requester_user_id
        FROM blood_request WHERE id=$requestId AND requester_user_id=$uid LIMIT 1
    ");
    $req = $reqRow ? $reqRow->fetch_assoc() : null;
    if (!$req) jsonResponse(['success' => false, 'error' => 'Request not found.'], 404);

    /* Verify the offer exists and is still pending */
    $offerRow = $conn->query("
        SELECT ast.id, ast.approver_user_id AS bank_user_id, bb.name AS bank_name
        FROM approval_step ast
        INNER JOIN blood_bank bb ON bb.id = ast.approver_user_id
        WHERE ast.id=$offerId AND ast.entity_id=$requestId
          AND ast.entity_type='blood_request' AND ast.status='pending'
        LIMIT 1
    ");
    $offer = $offerRow ? $offerRow->fetch_assoc() : null;
    if (!$offer) jsonResponse(['success' => false, 'error' => 'Offer not found or already processed.'], 404);

    $bankName  = $conn->real_escape_string($offer['bank_name']);
    $bankId    = (int)$offer['bank_user_id'];
    $reqNo     = str_pad($requestId, 4, '0', STR_PAD_LEFT);
    $bloodGroup = $conn->real_escape_string($req['blood_group']);

    /* ── How many units can this bank provide? ──
       Count available blood bags from this bank matching the blood group.
       Take MIN(units_available, units_still_needed) so we never overshoot. */
    $unitsRequired  = (int)$req['units_required'];
    $unitsFulfilled = (int)$req['units_fulfilled'];
    $unitsStillNeeded = max(0, $unitsRequired - $unitsFulfilled);

    $stockRow = $conn->query("
        SELECT COUNT(*) AS c FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND blood_group   = '$bloodGroup'
          AND status        = 'available'
          AND expiry_date   > CURDATE()
    ");
    $unitsAvailable = ($stockRow && ($sr = $stockRow->fetch_assoc())) ? (int)$sr['c'] : 0;

    /* Units to take from this bank */
    $unitsTaken = min($unitsAvailable, $unitsStillNeeded);
    if ($unitsTaken < 1) {
        /* Bank offered but has no stock left — reject the offer */
        $conn->query("UPDATE approval_step SET status='rejected', comments='No available stock at time of selection.' WHERE id=$offerId");
        jsonResponse(['success' => false, 'error' => "This bank has no available $bloodGroup stock right now. Please select another offer."], 422);
    }

    /* Mark this offer as approved, store units_taken in comments */
    $conn->query("UPDATE approval_step SET status='approved', comments='Selected by requester — $unitsTaken unit(s) to be provided.' WHERE id=$offerId");

    /* ── Reserve exactly $unitsTaken blood bags from this bank ──────────────
       Fetch the bag IDs to reserve (oldest first so near-expiry bags go first),
       then mark them 'reserved' so they disappear from available inventory
       and cannot be offered to other requesters.
    ── */
    $bagIds = [];
    $bagRows = $conn->query("
        SELECT id FROM blood_bag
        WHERE blood_bank_id = $bankId
          AND blood_group   = '$bloodGroup'
          AND status        = 'available'
          AND expiry_date   > CURDATE()
        ORDER BY expiry_date ASC
        LIMIT $unitsTaken
    ");
    if ($bagRows) {
        while ($br = $bagRows->fetch_assoc()) {
            $bagIds[] = (int)$br['id'];
        }
    }
    if (!empty($bagIds)) {
        $bagIdList = implode(',', $bagIds);
        $conn->query("
            UPDATE blood_bag
            SET status = 'reserved'
            WHERE id IN ($bagIdList)
        ");
    }

    /* Increment units_fulfilled by units taken (not just 1) */
    $conn->query("UPDATE blood_request SET units_fulfilled = units_fulfilled + $unitsTaken WHERE id=$requestId");

    /* Re-read units progress */
    $progRow = $conn->query("SELECT units_required, units_fulfilled FROM blood_request WHERE id=$requestId LIMIT 1");
    $prog = $progRow ? $progRow->fetch_assoc() : [];
    $unitsRequired  = (int)($prog['units_required']  ?? 1);
    $unitsFulfilled = (int)($prog['units_fulfilled']  ?? $unitsTaken);
    $fullyFulfilled = ($unitsFulfilled >= $unitsRequired);

    if ($fullyFulfilled) {
        /* Close the request */
        $conn->query("UPDATE blood_request SET status='approved', approved_at=NOW(), approved_by_bank_id=$bankId WHERE id=$requestId");
        /* Reject all other pending offers for this request */
        $conn->query("
            UPDATE approval_step SET status='rejected', comments='Request fully fulfilled by other offers.'
            WHERE entity_id=$requestId AND entity_type='blood_request'
              AND status='pending' AND id != $offerId
        ");
        /* Notify rejected banks */
        $others = $conn->query("
            SELECT DISTINCT approver_user_id FROM approval_step
            WHERE entity_id=$requestId AND entity_type='blood_request'
              AND status='rejected' AND id != $offerId
        ");
        if ($others) {
            while ($ob = $others->fetch_assoc()) {
                $oid = (int)$ob['approver_user_id'];
                $conn->query("INSERT INTO notification (user_id,title,message) VALUES
                    ($oid,'Offer Not Selected','Thank you for offering blood for request #REQ-$reqNo. The requester has fulfilled all units needed.')");
            }
        }
    }

    /* Notify selected bank with exact units needed */
    $conn->query("INSERT INTO notification (user_id,title,message) VALUES
        ($bankId,'🎯 Your Offer Was Selected','The requester has selected your offer for request #REQ-$reqNo. Please prepare $unitsTaken unit(s) of {$bloodGroup} blood for pickup/delivery.')");

    /* Build response message */
    $unitsLeft = max(0, $unitsRequired - $unitsFulfilled);
    if ($fullyFulfilled) {
        $msg = "Blood bank accepted! All $unitsRequired unit(s) collected. Your request is now fulfilled.";
    } else {
        $msg = "Blood bank accepted! $unitsFulfilled of $unitsRequired unit(s) collected. $unitsLeft more needed.";
    }

    jsonResponse([
        'success'         => true,
        'message'         => $msg,
        'request_id'      => $requestId,
        'offer_id'        => $offerId,
        'units_required'  => $unitsRequired,
        'units_fulfilled' => $unitsFulfilled,
        'fully_fulfilled' => $fullyFulfilled,
    ]);
}

/* ── rate_bank: donor rates a blood bank (table: bank_review) ── */
function handleRateBank()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $bankId     = (int)($data['blood_bank_id'] ?? $data['bank_id'] ?? 0);
    $rating     = (int)($data['rating']        ?? 0);
    $reviewText = $conn->real_escape_string(trim($data['review_text'] ?? $data['comment'] ?? ''));

    if (!$bankId || $rating < 1 || $rating > 5)
        jsonResponse(['success' => false, 'error' => 'blood_bank_id and rating (1–5) are required.'], 422);

    /* One review per user per bank — upsert */
    $conn->query("
        INSERT INTO bank_review (blood_bank_id, reviewer_user_id, rating, review_text, created_at)
        VALUES ($bankId, $uid, $rating, '$reviewText', NOW())
        ON DUPLICATE KEY UPDATE rating = $rating, review_text = '$reviewText', updated_at = NOW()
    ");

    jsonResponse(['success' => true, 'message' => 'Thank you for your rating!']);
}

/* ── antibody: returns donor's own antibody records ── */
function handleAntibody()
{
    global $conn;
    $uid = requireAuth();

    $stmt = $conn->prepare("
        SELECT antibody_name, is_donor,
               DATE_FORMAT(detected_at, '%b %Y') AS detected_date
        FROM antibody_profile
        WHERE user_id = ?
        ORDER BY detected_at DESC
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $antibodies = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse(['success' => true, 'antibodies' => $antibodies]);
}

/* ── blood_banks: returns list of blood banks ── */
function handleBloodBanks()
{
    global $conn;
    requireAuth();
    $city = $conn->real_escape_string(trim($_GET['city'] ?? ''));

    /* Return blood banks, hospitals AND medical colleges — all accept donations */
    $sql = "SELECT id, name, city, address_line AS address, phone,
                   latitude, longitude, role
            FROM blood_bank
            WHERE status = 'active'
              AND role IN ('blood_bank', 'hospital', 'medical_college')";
    if ($city) $sql .= " AND city = '$city'";
    $sql .= " ORDER BY role ASC, name ASC";

    $result = $conn->query($sql);
    $rows   = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];

    /* Add a human-readable type label for the dropdown */
    $roleLabel = [
        'blood_bank'      => 'Blood Bank',
        'hospital'        => 'Hospital',
        'medical_college' => 'Medical College',
    ];
    foreach ($rows as &$row) {
        $row['type_label'] = $roleLabel[$row['role']] ?? 'Blood Bank';
        /* Append type to name so JS dropdown shows e.g. "Dhaka Hospital (Hospital)" */
        $row['name'] = $row['name'] . ' (' . $row['type_label'] . ')';
    }
    unset($row);

    jsonResponse(['success' => true, 'banks' => $rows]);
}

/* ── delivery: returns active drone delivery for this user ── */
function handleDelivery()
{
    global $conn;
    $uid = requireAuth();

    $stmt = $conn->prepare("
        SELECT dd.id, dd.status, dd.estimated_arrival, dd.actual_arrival,
               dd.destination_lat, dd.destination_lng,
               dd.current_lat, dd.current_lng,
               d.drone_code, d.battery_level,
               bb.name AS source_bank_name,
               br.blood_group
        FROM drone_dispatch dd
        INNER JOIN blood_request br ON br.id = dd.blood_request_id
        LEFT JOIN drone d ON d.id = dd.drone_id
        LEFT JOIN blood_bank bb ON bb.id = dd.source_bank_id
        WHERE br.requester_user_id = ?
          AND dd.status IN ('dispatched','in_transit','delivering')
        ORDER BY dd.id DESC
        LIMIT 1
    ");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $delivery = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    jsonResponse(['success' => true, 'delivery' => $delivery]);
}

/* ── emergency_approve: donor offers to help an emergency request ── */
function handleEmergencyApprove()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    if (!$requestId) jsonResponse(['success' => false, 'error' => 'request_id required.'], 422);

    $conn->query("
        UPDATE emergency_request
        SET matched_donor_count = matched_donor_count + 1
        WHERE id = $requestId
    ");

    $nStmt = $conn->prepare("SELECT full_name FROM users WHERE id=? LIMIT 1");
    $nStmt->bind_param('i', $uid);
    $nStmt->execute();
    $donorName = $nStmt->get_result()->fetch_assoc()['full_name'] ?? 'A donor';
    $nStmt->close();

    $reqRow = $conn->query("SELECT requester_user_id FROM emergency_request WHERE id=$requestId LIMIT 1");
    if ($reqRow && ($rr = $reqRow->fetch_assoc())) {
        $rid = (int)$rr['requester_user_id'];
        $conn->query("INSERT INTO notification (user_id,title,message)
            VALUES ($rid,'Emergency Donor Found','" . $conn->real_escape_string($donorName) . " has offered to help with your emergency blood request.')");
    }

    jsonResponse(['success' => true, 'message' => 'Thank you! The requester has been notified.']);
}

/* ── emergency_ignore: donor dismisses an emergency request ── */
function handleEmergencyIgnore()
{
    requireAuth();
    jsonResponse(['success' => true, 'message' => 'Request dismissed.']);
}

/* ================================================================
   COMPLETE DONATION — requester confirms the donation completed
   Called with: { request_id }
   Marks request status as 'completed'.
=============================================================== */
function handleCompleteDonation()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);

    if (!$requestId) jsonResponse(['success' => false, 'error' => 'request_id required.'], 422);

    /* Verify request belongs to this user and is approved */
    $chk = $conn->query("SELECT id, status FROM blood_request WHERE id=$requestId AND requester_user_id=$uid AND status='approved' LIMIT 1");
    if (!$chk || !($req = $chk->fetch_assoc()))
        jsonResponse(['success' => false, 'error' => 'Request not found or not yet approved.'], 404);

    $conn->query("UPDATE blood_request SET status = 'completed' WHERE id = $requestId");

    $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);
    /* Notify all accepted donors */
    $doneDonors = $conn->query("
        SELECT DISTINCT bct.donor_user_id
        FROM blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        WHERE bct.request_id = $requestId AND bb.status = 'used'
    ");
    if ($doneDonors) {
        while ($dd = $doneDonors->fetch_assoc()) {
            $ddid = (int)$dd['donor_user_id'];
            $conn->query("INSERT INTO notification (user_id, title, message)
                VALUES ($ddid, 'Donation Completed', 'The requester has confirmed your donation for request #REQ-$reqNo as complete. Thank you for saving a life!')");
        }
    }

    jsonResponse(['success' => true, 'message' => 'Donation marked as completed.', 'status' => 'completed']);
}

/* ================================================================
   PAY DONOR — requester marks payment to a donor as completed
   Called with: { request_id, bag_id }
   If bag_id is omitted, pays all accepted donors for this request.
=============================================================== */
function handlePayDonor()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    $bagId     = (int)($data['bag_id'] ?? 0);

    if (!$requestId) jsonResponse(['success' => false, 'error' => 'request_id required.'], 422);

    /* Verify request belongs to this user and is approved/fullfilled */
    $chk = $conn->query("SELECT id, payment_status FROM blood_request WHERE id=$requestId AND requester_user_id=$uid AND status='approved' LIMIT 1");
    if (!$chk || !($req = $chk->fetch_assoc()))
        jsonResponse(['success' => false, 'error' => 'Request not found or not yet approved.'], 404);

    if ($bagId) {
        /* Pay specific donor by bag_id */
        $conn->query("
            UPDATE blood_culture_test bct
            INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            SET bct.price_accepted = 1
            WHERE bct.request_id = $requestId
              AND bb.id = $bagId
              AND bb.status = 'used'
        ");
    } else {
        /* Pay ALL accepted donors for this request */
        $conn->query("
            UPDATE blood_culture_test bct
            INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
            SET bct.price_accepted = 1
            WHERE bct.request_id = $requestId
              AND bb.status = 'used'
        ");
    }

    /* Update request payment status and mark as completed */
    $conn->query("UPDATE blood_request SET payment_status = 'paid', status = 'completed' WHERE id = $requestId");

    /* Notify donors who were just paid */
    $paidDonors = $conn->query("
        SELECT DISTINCT bct.donor_user_id, u.full_name
        FROM blood_culture_test bct
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        INNER JOIN users u ON u.id = bct.donor_user_id
        WHERE bct.request_id = $requestId
          AND bb.status = 'used'
          AND bct.price_accepted = 1
    ");
    if ($paidDonors) {
        $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);
        while ($pd = $paidDonors->fetch_assoc()) {
            $did = (int)$pd['donor_user_id'];
            $conn->query("INSERT INTO notification (user_id, title, message)
                VALUES ($did, 'Payment Received', 'Thank you for donating! The requester has confirmed payment for request #REQ-$reqNo.')");
        }
    }

    jsonResponse(['success' => true, 'message' => 'Payment marked as completed.', 'payment_status' => 'paid', 'status' => 'completed']);
}

/* ================================================================
   DONOR DID NOT COME — requester reports a donor never showed up
   Called with: { request_id, bag_id }
   Reverts the blood bag acceptance for that specific donor.
=============================================================== */
function handleDonorNotCome()
{
    global $conn;
    $uid  = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $requestId = (int)($data['request_id'] ?? 0);
    $bagId     = (int)($data['bag_id'] ?? 0);

    if (!$requestId || !$bagId)
        jsonResponse(['success' => false, 'error' => 'request_id and bag_id are required.'], 422);

    /* Verify this bag was accepted for this request and belongs to this user's request */
    $chk = $conn->query("
        SELECT bct.id AS test_id, bct.donor_user_id, bb.status AS bag_status,
               br.status AS req_status, br.units_fulfilled, br.units_required
        FROM blood_request br
        INNER JOIN blood_culture_test bct ON bct.request_id = br.id
        INNER JOIN blood_bag bb ON bb.id = bct.blood_bag_id
        WHERE br.id = $requestId
          AND br.requester_user_id = $uid
          AND bb.id = $bagId
          AND bb.status = 'used'
        LIMIT 1
    ");
    if (!$chk || !($row = $chk->fetch_assoc()))
        jsonResponse(['success' => false, 'error' => 'Accepted blood bag not found for this request.'], 404);

    $donorUid = (int)$row['donor_user_id'];
    $wasApproved = ($row['req_status'] === 'approved');
    $unitsFulfilled = (int)$row['units_fulfilled'];
    $unitsRequired  = (int)$row['units_required'];

    /* 1. Return blood bag to available */
    $conn->query("UPDATE blood_bag SET status = 'available' WHERE id = $bagId");

    /* 1b. Reject the culture test for this specific donor so they don't reappear in timeline */
    $conn->query("UPDATE blood_culture_test SET status = 'rejected', comments = 'Donor did not come.', blood_bag_id = NULL WHERE blood_bag_id = $bagId AND request_id = $requestId");

    /* 2. Decrement units_fulfilled */
    $newFulfilled = max(0, $unitsFulfilled - 1);
    $conn->query("UPDATE blood_request SET units_fulfilled = $newFulfilled WHERE id = $requestId");

    /* 3. If request was 'approved', revert to 'pending' and clear approved_by */
    if ($wasApproved) {
        $conn->query("UPDATE blood_request SET status = 'pending', approved_by_user_id = NULL, approved_at = NULL WHERE id = $requestId");
    }

    /* 4. Mark donation_promise as 'broken' */
    $conn->query("
        UPDATE donation_promise
        SET status = 'broken'
        WHERE donor_user_id = $donorUid
          AND status = 'fulfilled'
          AND DATE(fulfilled_at) = CURDATE()
        LIMIT 1
    ");

    /* 5. Re-open rejected culture tests from OTHER donors that were rejected
          when the request was fully fulfilled, so their bags reappear in the
          timeline modal and new donors can also see this request as pending. */
    $conn->query("
        UPDATE blood_culture_test
        SET status = 'approved', comments = NULL
        WHERE request_id = $requestId
          AND status = 'rejected'
          AND comments = 'Request fully fulfilled by other donors.'
          AND blood_bag_id IS NOT NULL
    ");

    /* 6. Reduce donor's trust score and decrement total_donations if > 0 */
    $conn->query("
        UPDATE donor_recipient
        SET trust_score = GREATEST(0, trust_score - 10),
            total_donations = GREATEST(0, COALESCE(total_donations, 0) - 1)
        WHERE user_id = $donorUid
    ");

    /* 7. Notify the donor */
    $reqNo = str_pad($requestId, 4, '0', STR_PAD_LEFT);
    $conn->query("INSERT INTO notification (user_id, title, message)
        VALUES ($donorUid, 'Donation Reverted', 'The requester has reported that you did not come for request #REQ-$reqNo. Your donation record has been reverted.')");

    /* 8. Notify other donors that the request is open again */
    $otherDonors = $conn->query("SELECT DISTINCT donor_user_id FROM blood_culture_test WHERE request_id = $requestId AND donor_user_id != $donorUid AND status = 'approved' AND blood_bag_id IS NOT NULL");
    if ($otherDonors) {
        while ($od = $otherDonors->fetch_assoc()) {
            $odid = (int)$od['donor_user_id'];
            $conn->query("INSERT INTO notification (user_id, title, message)
                VALUES ($odid, 'Request Reopened', 'The request #REQ-$reqNo has been reopened. Your previously offered blood bag is now available for acceptance again.')");
        }
    }

    $msg = $wasApproved
        ? "Donor marked as not arrived. Request reverted to pending and reopened for other donors. ($newFulfilled of $unitsRequired units fulfilled)"
        : "Donor marked as not arrived. Units fulfilled updated to $newFulfilled of $unitsRequired.";

    jsonResponse([
        'success'         => true,
        'message'         => $msg,
        'units_fulfilled' => $newFulfilled,
        'units_required'  => $unitsRequired,
        'status'          => $wasApproved ? 'pending' : 'approved',
    ]);
}

/* ══════════════════════════════════════════════════════════
   REWARDS & REDEMPTION
══════════════════════════════════════════════════════════ */

function ensureRewardsTable()
{
    global $conn;
    $conn->query("
        CREATE TABLE IF NOT EXISTS `donor_rewards` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `donor_user_id` INT(11) NOT NULL,
            `milestone` INT(11) NOT NULL COMMENT 'Milestone number (1=10, 2=20, 4=40 donations)',
            `tier` TINYINT(4) NOT NULL COMMENT '0=tshirt, 1=coupon_10, 2=coupon_25',
            `reward_type` VARCHAR(20) NOT NULL,
            `coupon_code` VARCHAR(50) DEFAULT NULL,
            `redeemed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `unique_milestone` (`donor_user_id`, `milestone`),
            KEY `donor_user_id` (`donor_user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    if ($conn->error) {
        jsonResponse(['success' => false, 'error' => 'DB setup error: ' . $conn->error], 500);
    }
}

function getMilestoneTier($milestone)
{
    // $milestone = floor(donations / 10), so 10→1, 20→2, 40→4
    $map = [1 => 0, 2 => 1, 4 => 2];
    return $map[$milestone] ?? -1;
}

function handleRewards()
{
    global $conn;
    try {
        $uid = requireAuth();
        ensureRewardsTable();

        /* Compute total_donations from all donation tracking sources */
        $dp = $conn->query("SELECT COUNT(*) AS cnt FROM donation_promise WHERE donor_user_id = $uid AND status = 'fulfilled'");
        $dn = $conn->query("SELECT COUNT(*) AS cnt FROM donation WHERE donor_user_id = $uid AND status = 'completed'");
        $total = max(
            $dp ? (int)$dp->fetch_assoc()['cnt'] : 0,
            $dn ? (int)$dn->fetch_assoc()['cnt'] : 0
        );
        $conn->query("UPDATE donor_recipient SET total_donations = $total WHERE user_id = $uid");

        // Get redeemed rewards
        $stmt = $conn->prepare("SELECT milestone, tier, reward_type, coupon_code, redeemed_at FROM donor_rewards WHERE donor_user_id = ? ORDER BY milestone ASC");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $result = $stmt->get_result();
        $redeemed = [];
        while ($row = $result->fetch_assoc()) {
            $row['redeemed_at'] = $row['redeemed_at'] ?? null;
            $row['coupon_code'] = $row['coupon_code'] ?? null;
            $redeemed[] = $row;
        }
        $stmt->close();

        $redeemedMilestones = array_values(array_map(function ($r) {
            return (int) $r['milestone'];
        }, $redeemed));

        // 3 fixed cards that cycle through tiers.
        // Card mappings (tier → db milestone pattern → donation target):
        //   Tier 0 (T-Shirt):     db = 1 + 4k → donations = 10 + 40k
        //   Tier 1 (10% coupon):  db = 2 + 4k → donations = 20 + 40k
        //   Tier 2 (25% coupon):  db = 4 + 4k → donations = 40 + 40k
        $BASE_DB   = [1, 2, 4];
        $BASE_DON  = [10, 20, 40];
        $roadmap = [];
        $nextTarget = null;
        $donationsForNext = null;
        $donationsNeeded = null;
        $nextTier = null;
        $availableRewards = [];

        foreach ([0, 1, 2] as $i) {
            $tier = REWARD_TIERS[$i];
            $baseDb = $BASE_DB[$i];
            $baseDon = $BASE_DON[$i];

            // How many times has this tier been claimed?
            $tierClaimed = array_values(array_filter($redeemedMilestones, function ($m) use ($baseDb) {
                return ($m - $baseDb) % 4 === 0 && $m >= $baseDb;
            }));
            $cycle = count($tierClaimed);

            $dbMilestone = $cycle * 4 + $baseDb;
            $effectiveDonations = $cycle * 40 + $baseDon;
            $isEarned = in_array($dbMilestone, $redeemedMilestones);
            $isUnlocked = $total >= $effectiveDonations;
            $isNext = false;

            if ($isUnlocked && !$isEarned) {
                $availableRewards[] = [
                    'milestone'    => $dbMilestone,
                    'tier'         => $tier,
                    'reward_type'  => REWARD_TYPES[$tier],
                    'reward_name'  => REWARD_NAMES[$tier],
                    'reward_icon'  => REWARD_ICONS[$tier],
                    'reward_desc'  => REWARD_DESCS[$tier],
                ];
            }

            if (!$isEarned && $nextTarget === null) {
                $isNext = true;
                $nextTarget = $effectiveDonations;
                if (!$isUnlocked) {
                    $donationsForNext = $effectiveDonations;
                    $donationsNeeded = $effectiveDonations - $total;
                    $nextTier = $tier;
                }
            }

            $state = 'locked';
            if ($isEarned) $state = 'claimed';
            elseif ($isUnlocked && !$isEarned) $state = 'available';
            elseif ($isNext) $state = 'next';

            $roadmap[] = [
                'donations'    => $effectiveDonations,
                'tier'         => $tier,
                'reward_type'  => REWARD_TYPES[$tier],
                'reward_name'  => REWARD_NAMES[$tier],
                'reward_icon'  => REWARD_ICONS[$tier],
                'state'        => $state,
                'redeemed'     => $isEarned,
                'milestone'    => $dbMilestone,
            ];
        }

        // Last claimed donation count (highest redeemed milestone × 10)
        $lastClaimedDonations = 0;
        $lastIdx = count($redeemed) - 1;
        if ($lastIdx >= 0) $lastClaimedDonations = (int) $redeemed[$lastIdx]['milestone'] * 10;

        // If the highest claim exceeds total_donations, the user has no
        // reachable milestones — reset the roadmap to the first cycle.
        if ($lastClaimedDonations > $total) {
            $roadmap = [
                ['donations' => 10, 'state' => 'next',  'tier' => 0, 'reward_type' => REWARD_TYPES[0], 'reward_name' => REWARD_NAMES[0], 'reward_icon' => REWARD_ICONS[0], 'milestone' => 1],
                ['donations' => 20, 'state' => 'locked', 'tier' => 1, 'reward_type' => REWARD_TYPES[1], 'reward_name' => REWARD_NAMES[1], 'reward_icon' => REWARD_ICONS[1], 'milestone' => 2],
                ['donations' => 40, 'state' => 'locked', 'tier' => 2, 'reward_type' => REWARD_TYPES[2], 'reward_name' => REWARD_NAMES[2], 'reward_icon' => REWARD_ICONS[2], 'milestone' => 4],
            ];
            $lastClaimedDonations = 0;
            $availableRewards = [];
        }

        if ($donationsForNext === null && empty($availableRewards)) {
            $donationsForNext = $lastClaimedDonations + 10;
            $donationsNeeded = $donationsForNext - $total;
            $nextTier = 0;
            $nextTarget = $donationsForNext;
            if ($donationsNeeded < 0) $donationsNeeded = 0;
        }

        jsonResponse([
            'success'               => true,
            'total_donations'       => $total,
            'available_rewards'     => $availableRewards,
            'redeemed_rewards'      => $redeemed,
            'reward_roadmap'        => $roadmap,
            'next_reward_name'      => $nextTier !== null ? REWARD_NAMES[$nextTier] . ' ' . REWARD_ICONS[$nextTier] : 'All Complete! 🎉',
            'donations_for_next'    => $donationsForNext,
            'donations_needed'      => $donationsNeeded,
            'last_claimed_donations' => $lastClaimedDonations,
        ]);
    } catch (Throwable $e) {
        jsonResponse(['success' => false, 'error' => 'Rewards error: ' . $e->getMessage()], 500);
    }
}

function generateCouponCode($tier)
{
    $prefix = $tier === 1 ? 'BB10' : 'BB25';
    $rand = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    return $prefix . '-' . $rand;
}

function handleDebugRewards()
{
    global $conn;
    try {
        $uid = requireAuth();
        $dpRes = $conn->query("SELECT COUNT(*) AS cnt FROM donation_promise WHERE donor_user_id = $uid AND status = 'fulfilled'");
        $dnRes = $conn->query("SELECT COUNT(*) AS cnt FROM donation WHERE donor_user_id = $uid AND status = 'completed'");
        $dpCnt = $dpRes ? (int)$dpRes->fetch_assoc()['cnt'] : 0;
        $dnCnt = $dnRes ? (int)$dnRes->fetch_assoc()['cnt'] : 0;
        $drRes = $conn->query("SELECT total_donations FROM donor_recipient WHERE user_id = $uid");
        $stored = $drRes ? (int)$drRes->fetch_assoc()['total_donations'] : -1;
        $dpList = $conn->query("SELECT id, status FROM donation_promise WHERE donor_user_id = $uid");
        $donations = [];
        if ($dpList) while ($r = $dpList->fetch_assoc()) $donations[] = $r;
        $dList = $conn->query("SELECT id, status FROM donation WHERE donor_user_id = $uid");
        $donationRows = [];
        if ($dList) while ($r = $dList->fetch_assoc()) $donationRows[] = $r;
        $rd = $conn->query("SELECT * FROM donor_rewards WHERE donor_user_id = $uid");
        $rewards = [];
        if ($rd) while ($r = $rd->fetch_assoc()) $rewards[] = $r;
        jsonResponse([
            'success'                => true,
            'stored_total_donations' => $stored,
            'donation_promise_cnt'   => $dpCnt,
            'donation_cnt'           => $dnCnt,
            'computed_max'           => max($dpCnt, $dnCnt),
            'donation_promise_rows'  => $donations,
            'donation_rows'          => $donationRows,
            'donor_rewards'          => $rewards,
        ]);
    } catch (Throwable $e) {
        jsonResponse(['success' => false, 'error' => 'Debug error: ' . $e->getMessage()], 500);
    }
}

function handleRedeemReward()
{
    global $conn;
    try {
        $uid = requireAuth();
        ensureRewardsTable();

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $requestedMilestone = isset($body['milestone']) ? (int) $body['milestone'] : null;

        /* Compute total_donations from all donation tracking sources */
        $dp = $conn->query("SELECT COUNT(*) AS cnt FROM donation_promise WHERE donor_user_id = $uid AND status = 'fulfilled'");
        $dn = $conn->query("SELECT COUNT(*) AS cnt FROM donation WHERE donor_user_id = $uid AND status = 'completed'");
        $total = max(
            $dp ? (int)$dp->fetch_assoc()['cnt'] : 0,
            $dn ? (int)$dn->fetch_assoc()['cnt'] : 0
        );
        $conn->query("UPDATE donor_recipient SET total_donations = $total WHERE user_id = $uid");

        // Get already-claimed milestones
        $stmt = $conn->prepare("SELECT milestone FROM donor_rewards WHERE donor_user_id = ?");
        $stmt->bind_param('i', $uid);
        $stmt->execute();
        $result = $stmt->get_result();
        $claimed = [];
        while ($row = $result->fetch_assoc()) $claimed[] = (int) $row['milestone'];
        $stmt->close();

        // Map requested milestone to the correct tier
        $BASE_DB  = [1, 2, 4];
        $BASE_DON = [10, 20, 40];
        $tierMap = [];
        foreach ([0, 1, 2] as $i) {
            $baseDb = $BASE_DB[$i];
            $baseDon = $BASE_DON[$i];
            $tierClaimed = array_values(array_filter($claimed, function ($m) use ($baseDb) {
                return ($m - $baseDb) % 4 === 0 && $m >= $baseDb;
            }));
            $cycle = count($tierClaimed);
            $dbMilestone = $cycle * 4 + $baseDb;
            $effectiveDonations = $cycle * 40 + $baseDon;
            $tierMap[$dbMilestone] = [
                'tier'      => $i,
                'donations' => $effectiveDonations,
            ];
        }

        // If the requested milestone is invalid or not yet eligible, fall back
        // to the first eligible milestone (tier order).
        $availableM = null;
        $availableIdx = null;

        if ($requestedMilestone !== null && isset($tierMap[$requestedMilestone])) {
            $candidate = $tierMap[$requestedMilestone];
            if ($total >= $candidate['donations'] && !in_array($requestedMilestone, $claimed)) {
                $availableM = $requestedMilestone;
                $availableIdx = $candidate['tier'];
            }
        }

        if ($availableM === null) {
            foreach ([0, 1, 2] as $i) {
                $baseDb = $BASE_DB[$i];
                $baseDon = $BASE_DON[$i];
                $tierClaimed = array_values(array_filter($claimed, function ($m) use ($baseDb) {
                    return ($m - $baseDb) % 4 === 0 && $m >= $baseDb;
                }));
                $cycle = count($tierClaimed);
                $dbMilestone = $cycle * 4 + $baseDb;
                $effectiveDonations = $cycle * 40 + $baseDon;
                if ($total >= $effectiveDonations && !in_array($dbMilestone, $claimed)) {
                    $availableM = $dbMilestone;
                    $availableIdx = $i;
                    break;
                }
            }
        }

        if ($availableM === null) {
            jsonResponse(['success' => false, 'error' => 'No rewards available to redeem.'], 400);
        }

        $tier = REWARD_TIERS[$availableIdx];
        $rewardType = REWARD_TYPES[$tier];
        $rewardName = REWARD_NAMES[$tier];

        $couponCode = null;
        if ($tier === 1 || $tier === 2) {
            $couponCode = generateCouponCode($tier);
        }

        $stmt = $conn->prepare("INSERT INTO donor_rewards (donor_user_id, milestone, tier, reward_type, coupon_code) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param('iiiss', $uid, $availableM, $tier, $rewardType, $couponCode);
        $stmt->execute();
        $stmt->close();

        $msg = $couponCode
            ? "Congratulations! You've redeemed a $rewardName! Your coupon code: $couponCode"
            : "Congratulations! You've redeemed a $rewardName! Please provide your shipping address in settings.";

        jsonResponse([
            'success'      => true,
            'message'      => $msg,
            'milestone'    => $availableM,
            'tier'         => $tier,
            'reward_type'  => $rewardType,
            'reward_name'  => $rewardName,
            'coupon_code'  => $couponCode,
        ]);
    } catch (Throwable $e) {
        jsonResponse(['success' => false, 'error' => 'Redeem error: ' . $e->getMessage()], 500);
    }
}
