-- ============================================================
-- AgentLab — Full Agent Catalog Seed
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Clear existing agents (optional — comment out if you want to keep existing)
-- DELETE FROM agents;

INSERT INTO agents (name, slug, description, category, is_premium, price_inr, input_schema, output_schema, active)
VALUES

-- ── FREE AI AGENTS ────────────────────────────────────────────────────────────

(
  'Text Summarizer',
  'text-summarizer',
  'Instantly summarise any text into clear bullet points. Paste an article, report, or document and get a concise summary with key takeaways in seconds.',
  'ai',
  false,
  0,
  '{
    "text": {
      "type": "textarea",
      "description": "The text you want to summarise",
      "example": "Paste any article, report, or long document here..."
    }
  }',
  '{
    "summary": "string",
    "key_points": "string[]",
    "word_count": "number",
    "model": "string"
  }',
  true
),

(
  'Code Explainer',
  'code-explainer',
  'Paste any code snippet and get a plain-English explanation. Understand what code does, which concepts it uses, and its complexity level — perfect for code reviews and learning.',
  'ai',
  false,
  0,
  '{
    "code": {
      "type": "textarea",
      "description": "The code snippet to explain",
      "example": "function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }"
    },
    "language": {
      "type": "text",
      "description": "Programming language (optional — auto-detected if left blank)",
      "example": "JavaScript"
    }
  }',
  '{
    "explanation": "string",
    "key_concepts": "string[]",
    "complexity": "string",
    "line_by_line": "object[]"
  }',
  true
),

(
  'Sentiment Analyzer',
  'sentiment-analyzer',
  'Detect the emotional tone of any text — product reviews, social media posts, customer feedback, or anything else. Returns sentiment score, emotions detected, and key influencing phrases.',
  'ai',
  false,
  0,
  '{
    "text": {
      "type": "textarea",
      "description": "Text to analyze for sentiment",
      "example": "I absolutely loved the product! The delivery was fast and the quality exceeded my expectations."
    }
  }',
  '{
    "sentiment": "string",
    "score": "number",
    "confidence": "number",
    "emotions": "string[]",
    "key_phrases": "string[]"
  }',
  true
),

(
  'Keyword Extractor',
  'keyword-extractor',
  'Extract the most relevant keywords, tags, and topic categories from any text. Perfect for SEO, content tagging, document indexing, and research organisation.',
  'ai',
  false,
  0,
  '{
    "text": {
      "type": "textarea",
      "description": "Text to extract keywords from",
      "example": "Machine learning is a subset of artificial intelligence that enables computers to learn from data..."
    },
    "max_keywords": {
      "type": "text",
      "description": "Maximum number of keywords to return (1-20, default: 10)",
      "example": "10"
    }
  }',
  '{
    "keywords": "string[]",
    "tags": "string[]",
    "topics": "string[]",
    "language": "string"
  }',
  true
),

-- ── FREE UTILITY AGENTS ───────────────────────────────────────────────────────

(
  'JSON Formatter',
  'json-formatter',
  'Format, minify, or validate any JSON instantly. Beautify messy JSON for readability, minify it to save bytes, or validate it catches syntax errors with a clear explanation.',
  'utility',
  false,
  0,
  '{
    "json": {
      "type": "textarea",
      "description": "JSON string to process",
      "example": "{\"name\":\"John\",\"age\":30,\"city\":\"New York\"}"
    },
    "action": {
      "type": "text",
      "description": "What to do: format, minify, or validate",
      "example": "format"
    }
  }',
  '{
    "valid": "boolean",
    "result": "string",
    "key_count": "number",
    "depth": "number"
  }',
  true
),

(
  'Password Generator',
  'password-generator',
  'Generate cryptographically secure passwords with entropy analysis. Choose length, character sets, and how many passwords you need. Each password comes with a strength rating and security tips.',
  'utility',
  false,
  0,
  '{
    "length": {
      "type": "text",
      "description": "Password length (4-128 characters, default: 16)",
      "example": "16"
    },
    "count": {
      "type": "text",
      "description": "Number of passwords to generate (1-10, default: 3)",
      "example": "3"
    },
    "include_symbols": {
      "type": "text",
      "description": "Include symbols like !@#$%^&* (true/false, default: true)",
      "example": "true"
    },
    "include_numbers": {
      "type": "text",
      "description": "Include numbers 0-9 (true/false, default: true)",
      "example": "true"
    }
  }',
  '{
    "passwords": "string[]",
    "strength": "string",
    "entropy_bits": "number",
    "tips": "string[]"
  }',
  true
),

-- ── PREMIUM AI AGENTS ─────────────────────────────────────────────────────────

(
  'Email Drafter',
  'email-drafter',
  'Write professional emails in seconds. Give a topic, tone, and key bullet points — get a polished, ready-to-send email with subject line and multiple subject alternatives.',
  'ai',
  true,
  49900,
  '{
    "topic": {
      "type": "text",
      "description": "What the email is about",
      "example": "Request for project deadline extension due to technical issues"
    },
    "tone": {
      "type": "text",
      "description": "Tone: Professional, Friendly, Formal, Casual, Persuasive, Apologetic",
      "example": "Professional"
    },
    "bullet_points": {
      "type": "textarea",
      "description": "Key points to cover in the email (one per line)",
      "example": "- Original deadline was Jan 15\n- Need 1 more week\n- Will deliver Jan 22\n- Extra QA will be done"
    },
    "recipient_name": {
      "type": "text",
      "description": "Recipient name for personalisation (optional)",
      "example": "Mr. Sharma"
    }
  }',
  '{
    "subject": "string",
    "body": "string",
    "alternative_subjects": "string[]",
    "word_count": "number"
  }',
  true
),

(
  'Grammar Checker',
  'grammar-checker',
  'Professional-grade grammar, spelling, and style checker. Get your text corrected with detailed explanations for every change, style improvement suggestions, and an overall writing quality score.',
  'ai',
  true,
  29900,
  '{
    "text": {
      "type": "textarea",
      "description": "Text to check and correct (max 5000 characters)",
      "example": "Their are many reason why good grammer is important in proffesional communication. It shows you care about you work."
    }
  }',
  '{
    "corrected": "string",
    "errors": "object[]",
    "suggestions": "string[]",
    "score": "number",
    "readability": "string"
  }',
  true
),

(
  'SMS Sender',
  'sms-sender',
  'Send SMS messages programmatically to any phone number worldwide. Powered by Twilio. Perfect for notifications, OTPs, alerts, and customer communication workflows.',
  'utility',
  true,
  19900,
  '{
    "to": {
      "type": "text",
      "description": "Recipient phone number in E.164 format",
      "example": "+919876543210"
    },
    "message": {
      "type": "textarea",
      "description": "Message content (max 1600 characters)",
      "example": "Hello! Your order #12345 has been shipped and will arrive by tomorrow."
    }
  }',
  '{
    "sent": "boolean",
    "sid": "string",
    "to": "string"
  }',
  true
)

ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  category     = EXCLUDED.category,
  is_premium   = EXCLUDED.is_premium,
  price_inr    = EXCLUDED.price_inr,
  input_schema = EXCLUDED.input_schema,
  output_schema = EXCLUDED.output_schema,
  active       = EXCLUDED.active;

-- Verify
SELECT slug, name, is_premium, price_inr, active FROM agents ORDER BY is_premium, category, name;
