<?php
/**
 * Blood Bridge - API Keys Configuration
 * All keys are loaded from .env — never hardcode credentials here.
 */

define('GEMINI_API_KEY',      $_ENV['GEMINI_API_KEY']       ?? '');

/**
 * Groq API — fast, reliable, generous free tier
 * Sign up: https://console.groq.com
 */
define('GROQ_API_KEY',        $_ENV['GROQ_API_KEY']         ?? '');
define('GROQ_MODEL',          $_ENV['GROQ_MODEL']           ?? 'llama-3.1-8b-instant');

/**
 * OpenRouter API — secondary AI backend
 */
define('OPENROUTER_API_KEY',  $_ENV['OPENROUTER_API_KEY']   ?? '');
define('OPENROUTER_MODEL',    $_ENV['OPENROUTER_MODEL']     ?? 'qwen/qwen3-next-80b-a3b-instruct:free');

/**
 * Hugging Face Inference API — tertiary AI backend
 */
define('HF_API_KEY',          $_ENV['HF_API_KEY']           ?? '');
define('HF_MODEL',            $_ENV['HF_MODEL']             ?? 'microsoft/Phi-3-mini-4k-instruct');