<?php
/* ============================================================
   BloodBridge — guest_chat_api.php
   Public chatbot endpoint for unauthenticated (guest) users.
   No database storage — sessionStorage on client side.
   ============================================================ */
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

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'guest_chatbot':
        handleGuestChatbot();
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Unknown action: ' . htmlspecialchars($action)], 400);
}

/* ══════════════════════════════════════════════════════════
   GUEST CHATBOT — no auth required, no DB storage
   ══════════════════════════════════════════════════════════ */
function handleGuestChatbot()
{
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $message = trim($data['message'] ?? '');
    $context = $data['context'] ?? [];

    if (!$message) {
        jsonResponse(['success' => false, 'error' => 'Message is required.'], 422);
    }

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

    jsonResponse([
        'success'  => true,
        'response' => $botResponse,
        '_debug'   => $GLOBALS['or_debug'] ?? null,
        '_gemini'  => $GLOBALS['gemini_debug'] ?? null,
        '_hf'      => $GLOBALS['hf_debug'] ?? null,
        '_groq'    => $GLOBALS['groq_debug'] ?? null,
    ]);
}
