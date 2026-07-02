<?php
/* ============================================================
   Raktosathi AI — Shared Response Functions
   BloodBridge Project
   Used by: donor_recipient_api.php, guest_chat_api.php
   ============================================================ */

function geminiChat($message, $contextMessages)
{
    $GLOBALS['gemini_debug'] = [];
    if (!defined('GEMINI_API_KEY') || empty(GEMINI_API_KEY)) {
        $GLOBALS['gemini_debug']['error'] = 'API key not defined';
        return null;
    }

    $system = 'You are Raktosathi 🩸 — an intelligent, warm, human-like AI assistant. '
            . 'You specialize in blood donation and healthcare, but can answer ANY question — coding, science, general chat, etc. '
            . 'Behave like a real modern AI assistant. Respond naturally, adapt tone, never be robotic. '
            . 'Never say "I can only answer blood donation questions." '
            . 'If asked in Bangla, reply in Bangla. Never diagnose diseases. '
            . 'Be warm, supportive, and conversational.';

    $contents = [];
    $contents[] = ['role' => 'user', 'parts' => [['text' => "[System] $system"]]];
    $contents[] = ['role' => 'model', 'parts' => [['text' => 'Understood. I am ready to assist with blood donation questions.']]];
    $ctx = array_slice($contextMessages, -8);
    foreach ($ctx as $m) {
        $role = ($m['sender'] ?? 'user') === 'user' ? 'user' : 'model';
        $contents[] = ['role' => $role, 'parts' => [['text' => $m['message']]]];
    }

    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' . GEMINI_API_KEY;
    $body = json_encode([
        'contents' => $contents,
        'generationConfig' => ['temperature' => 0.4, 'maxOutputTokens' => 300],
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $GLOBALS['gemini_debug'] = [
        'http_code' => $httpCode,
        'error' => $curlError,
        'response_preview' => substr($resp ?? '', 0, 500),
    ];

    if ($httpCode !== 200 || empty($resp)) return null;

    $data = json_decode($resp, true);
    $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
    if (!$text) {
        $GLOBALS['gemini_debug']['parse_error'] = 'empty text from response';
        return null;
    }
    $text = trim($text);
    if (preg_match('/```(?:text)?\s*([\s\S]+?)\s*```/', $text, $m)) $text = trim($m[1]);

    return $text;
}

function openrouterChat($message, $contextMessages)
{
    $GLOBALS['or_debug'] = [];
    if (!defined('OPENROUTER_API_KEY') || empty(OPENROUTER_API_KEY)) return null;
    if (!defined('OPENROUTER_MODEL') || empty(OPENROUTER_MODEL)) return null;

    $messages = [
        ['role' => 'system', 'content' => "You are Raktosathi 🩸 — an intelligent, warm AI assistant. You specialize in blood donation and healthcare, but can answer ANY question (coding, science, general chat, etc.). Behave like ChatGPT or Gemini. Respond naturally, never be robotic. Never say 'I can only answer blood donation questions.' If asked in Bangla, reply in Bangla. Be warm, supportive, and conversational."],
        ['role' => 'assistant', 'content' => "I am Raktosathi 🩸. I will answer naturally and helpfully."],
    ];

    $ctx = array_slice($contextMessages, -8);
    foreach ($ctx as $m) {
        $messages[] = ['role' => ($m['sender'] ?? 'user') === 'user' ? 'user' : 'assistant', 'content' => $m['message']];
    }

    $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'model' => OPENROUTER_MODEL,
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 600,
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENROUTER_API_KEY,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $GLOBALS['or_debug'] = [
        'http_code' => $httpCode,
        'error' => $curlError,
        'response_preview' => substr($resp ?? '', 0, 500),
    ];

    if ($httpCode !== 200 || empty($resp)) return null;

    $data = json_decode($resp, true);
    if (!isset($data['choices'][0]['message']['content'])) {
        $GLOBALS['or_debug']['parse_error'] = 'missing choices[0].message.content';
        return null;
    }

    return trim($data['choices'][0]['message']['content']) ?: null;
}

function huggingfaceChat($message, $contextMessages)
{
    $GLOBALS['hf_debug'] = [];
    if (!defined('HF_API_KEY') || empty(HF_API_KEY)) return null;
    if (!defined('HF_MODEL') || empty(HF_MODEL)) return null;

    $system = "You are Raktosathi 🩸 — an intelligent, warm AI assistant. You specialize in blood donation and healthcare, but can answer ANY question (coding, science, general chat, etc.). Behave like ChatGPT. Respond naturally, never be robotic. Never say 'I can only answer blood donation questions.' If asked in Bangla, reply in Bangla. Be warm, supportive, and conversational.";

    $prompt = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n$system<|eot_id|>";

    $ctx = array_slice($contextMessages, -8);
    foreach ($ctx as $m) {
        $role = ($m['sender'] ?? 'user') === 'user' ? 'user' : 'assistant';
        $content = $m['message'];
        $prompt .= "<|start_header_id|>$role<|end_header_id|>\n\n$content<|eot_id|>";
    }

    $prompt .= "<|start_header_id|>assistant<|end_header_id|>\n\n";

    $ch = curl_init('https://api-inference.huggingface.co/models/' . HF_MODEL);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'inputs' => $prompt,
            'parameters' => [
                'max_new_tokens' => 600,
                'temperature' => 0.7,
                'top_p' => 0.95,
                'return_full_text' => false,
            ],
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . HF_API_KEY,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $GLOBALS['hf_debug'] = [
        'http_code' => $httpCode,
        'error' => $curlError,
        'response_preview' => substr($resp ?? '', 0, 500),
    ];

    if ($httpCode !== 200 || empty($resp)) return null;

    $data = json_decode($resp, true);
    $text = '';
    if (isset($data[0]['generated_text'])) {
        $text = $data[0]['generated_text'];
    } elseif (isset($data['generated_text'])) {
        $text = $data['generated_text'];
    }

    return trim($text) ?: null;
}

function groqChat($message, $contextMessages)
{
    $GLOBALS['groq_debug'] = [];
    if (!defined('GROQ_API_KEY') || empty(GROQ_API_KEY)) return null;
    if (!defined('GROQ_MODEL') || empty(GROQ_MODEL)) return null;

    $messages = [
        ['role' => 'user', 'content' => "[Instructions] You are Raktosathi, a warm intelligent AI assistant. You specialize in blood donation and healthcare but can answer ANY question. Behave like ChatGPT. Respond naturally, never be robotic. Never say 'I can only answer blood donation questions.' If asked in Bangla, reply in Bangla. Be supportive and conversational."],
        ['role' => 'assistant', 'content' => "Understood. I am Raktosathi, your AI assistant. How can I help?"],
    ];

    $ctx = array_slice($contextMessages, -8);
    foreach ($ctx as $m) {
        $content = trim($m['message'] ?? '');
        if ($content === '') continue;
        $role = ($m['sender'] ?? 'user') === 'user' ? 'user' : 'assistant';
        $messages[] = ['role' => $role, 'content' => $content];
    }

    $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'model' => GROQ_MODEL,
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 600,
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . GROQ_API_KEY,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $GLOBALS['groq_debug'] = [
        'http_code' => $httpCode,
        'error' => $curlError,
        'response_preview' => substr($resp ?? '', 0, 500),
    ];

    if ($httpCode !== 200 || empty($resp)) return null;

    $data = json_decode($resp, true);
    if (!isset($data['choices'][0]['message']['content'])) {
        $GLOBALS['groq_debug']['parse_error'] = 'missing choices[0].message.content';
        return null;
    }

    return trim($data['choices'][0]['message']['content']) ?: null;
}

function fallbackChatResponse($message)
{
    $patterns = [
        'nutrition' => ['eat', 'food', 'diet', 'meal', 'iron', 'spinach', 'vitamin', 'hungry', 'breakfast', 'lunch'],
        'phobia'    => ['scared', 'nervous', 'afraid', 'needle', 'fear', 'pain', 'hurt', 'anxious', 'phobia', 'faint', 'dizzy'],
        'eligibility'=> ['eligib', 'can.*donate', 'qualify', 'allowed', 'condition', 'disease', 'illness', 'sick', 'medicine', 'medication', 'pregnant', 'tattoo', 'age', 'weight', '56 days', 'bp', 'pressure', 'diabetes', 'hb', 'haemoglobin'],
        'gratitude'  => ['thank', 'thanks', 'good', 'helpful', 'great', 'awesome', 'wonderful', 'perfect', 'appreciate'],
        'process'    => ['how.*donate', 'process', 'step', 'procedure', 'how long', 'take', 'time', 'where.*go', 'find.*bank', 'nearby', 'appointment'],
        'aftercare'  => ['after.*donat', 'recover', 'rest', 'drink', 'water', 'juice', 'sleep', 'side.?effect', 'weak', 'tired', 'dizzy after'],
        'blood_group'=> ['blood group', 'blood type', 'a\+', 'b\+', 'o\+', 'ab\+', 'a-', 'b-', 'o-', 'ab-', 'compatible', 'universal', 'rare', 'rh', 'positive', 'negative'],
        'mental'     => ['depress', 'anxiety', 'sad', 'lonely', 'hopeless', 'worthless', 'stress', 'suicide', 'kill myself', 'no hope', 'panic', 'crying'],
        'greeting'   => ['^hi', '^hello', '^hey', '^good morn', '^good even', '^good afternoon', '^namaste', '^assalamu', '^howdy'],
        'about'      => ['who.*you', 'what.*you', 'raktosathi', 'your name', 'what can you', 'help me'],
    ];

    $scores = [];
    foreach ($patterns as $intent => $keywords) {
        $score = 0;
        foreach ($keywords as $kw) {
            if (preg_match('/' . $kw . '/i', $message)) $score++;
        }
        if ($score > 0) $scores[$intent] = $score;
    }
    arsort($scores);
    $intent = array_key_first($scores) ?: 'general';

    $responses = [
        'nutrition' => '🥗 **Pre-donation nutrition:** Eat iron-rich foods like spinach, lentils, beans, red meat, and fortified cereals 2-3 hours before donating. Vitamin C (orange juice) helps iron absorption. Avoid fatty/fried foods — they can affect blood tests. Stay hydrated!',
        'phobia' => '😌 **Needle fear is completely normal.** Here are tips: 1) Look away during the insertion. 2) Take slow, deep breaths. 3) Tell the staff — they are trained to help. 4) Distract yourself with your phone or music. Many first-time donors feel nervous, but 90% say it was much easier than expected!',
        'eligibility' => '🩸 **Basic eligibility:** ✅ Age 18-65 ✅ Weight at least 50kg ✅ No donation in last 56 days ✅ No major illness/infection ✅ Haemoglobin ≥ 12.5 g/dL ✅ BP within normal range. If you have a medical condition or take medication, check with our doctor. We also accept donors with controlled diabetes, asthma, and mild hypertension!',
        'gratitude' => '❤️ You are very welcome! Thank you for being a lifesaver — every donation can save up to 3 lives. Would you like to schedule your next donation or learn more about your impact?',
        'process' => '📋 **Donation process (15-20 min total):** 1) Registration & health questionnaire (5 min) 2) Quick haemoglobin test & BP check (3 min) 3) Actual blood donation (5-10 min) 4) Rest & refreshments (5 min). It is faster than you think! Bring a valid ID and have a light meal beforehand.',
        'aftercare' => '🩹 **After donation care:** Drink plenty of fluids (water, juice) for 24 hours. Avoid heavy lifting or intense exercise for the rest of the day. If you feel dizzy, lie down with feet elevated. Eat a good meal. The body replenishes plasma within 24-48 hours and red cells within 4-6 weeks.',
        'blood_group' => '🅰️🅱️ **Blood group facts:** O+ is the most common (36%), AB- is the rarest (1%). O- is the universal donor (can give to anyone). AB+ is the universal recipient (can receive from anyone). Blood groups are inherited from parents. Knowing your blood type is important for emergencies!',
        'mental' => '💙 **You matter.** If you are feeling depressed, anxious, or hopeless, please reach out for support. You can call our helpline at 999 or chat with a counselor. You are not alone — seeking help is a sign of strength. Would you like me to share some wellness tips?',
        'greeting' => '👋 Hello! I am Raktosathi, your Blood Companion. I can help with donation info, eligibility checks, health tips, and more. What would you like to know?',
        'about' => '🤖 I am **Raktosathi** — your AI Blood Donation Assistant! I can answer questions about: ✅ Donation eligibility ✅ Nutrition tips ✅ Needle phobia ✅ Donation process ✅ Aftercare ✅ Blood group facts. How can I help you today?',
        'general' => 'Hi! I am Raktosathi, your Blood Companion 🩸 I can answer questions about blood donation, eligibility, health tips, and more. Try asking: "Am I eligible to donate?", "What should I eat before donating?", or "I am scared of needles."',
    ];
    return $responses[$intent];
}
