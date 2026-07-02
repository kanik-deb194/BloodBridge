<?php
session_start();
require_once 'config.php';
require_once 'ai_functions.php';
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

function jsonResponse($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth()
{
    $uid = $_SESSION['user_id'] ?? null;
    if ($uid !== null && is_numeric($uid)) {
        return (int) $uid;
    }
    jsonResponse(['success' => false, 'error' => 'Unauthorised. Please log in.'], 401);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'chatbot_message':
        handleChatbotMessage();
        break;
    case 'chatbot_history':
        handleChatbotHistory();
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
}

function logChatMessage($conn, $uid, $sessionId, $message, $sender)
{
    $intent = $sender === 'bot' ? 'ai_response' : 'user_input';
    $stmt = $conn->prepare("INSERT INTO chat_log (user_id, session_id, message, sender, intent_detected) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param('issss', $uid, $sessionId, $message, $sender, $intent);
    $stmt->execute();
    $stmt->close();
}

function getChatContext($conn, $sessionId, $limit = 10)
{
    $stmt = $conn->prepare("SELECT message, sender FROM chat_log WHERE session_id = ? ORDER BY id DESC LIMIT ?");
    $stmt->bind_param('si', $sessionId, $limit);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return array_reverse($rows);
}

function handleChatbotHistory()
{
    global $conn;
    $uid = requireAuth();
    $sessionId = trim($_GET['session_id'] ?? ('CHAT-' . $uid));

    $stmt = $conn->prepare("SELECT message, sender, created_at FROM chat_log WHERE user_id = ? ORDER BY id ASC");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $history = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonResponse([
        'success'    => true,
        'history'    => $history,
        'session_id' => $sessionId,
    ]);
}

function handleChatbotMessage()
{
    global $conn;
    $uid = requireAuth();
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $message   = trim($data['message'] ?? '');
    $sessionId = trim($data['session_id'] ?? ('CHAT-' . $uid));

    if (!$message) {
        jsonResponse(['success' => false, 'error' => 'Message is required.'], 422);
    }

    logChatMessage($conn, $uid, $sessionId, $message, 'user');

    $context = getChatContext($conn, $sessionId, 10);

    $botResponse = groqChat($message, $context);

    if (!$botResponse) {
        $botResponse = geminiChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = openrouterChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = huggingfaceChat($message, $context);
    }

    if (!$botResponse) {
        $botResponse = fallbackChatResponse($message);
    }

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
