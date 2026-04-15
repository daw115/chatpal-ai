import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const { Pool } = pg;

// Database connection - using Supabase PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://postgres.weeezspysozziarccene:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);

    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, password FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);

    res.json({
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Chat endpoint with streaming
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, model, conversation_id } = req.body;

    console.log('[Chat] Request:', { model, messageCount: messages.length, conversation_id });

    const isClaude = model.startsWith('claude-');
    const url = isClaude
      ? 'https://api.quatarly.cloud/v1/messages'
      : 'https://api.quatarly.cloud/v1/chat/completions';

    const headers = isClaude
      ? {
          'x-api-key': process.env.QUATARLY_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      : {
          'Authorization': `Bearer ${process.env.QUATARLY_API_KEY}`,
          'Content-Type': 'application/json'
        };

    let body;
    if (isClaude) {
      const systemMessages = messages.filter(m => m.role === 'system');
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      const systemPrompt = systemMessages.map(m => m.content).join('\n') || undefined;

      body = {
        model,
        messages: nonSystemMessages,
        max_tokens: 8192,
        stream: true
      };
      if (systemPrompt) body.system = systemPrompt;
    } else {
      body = {
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] Quatarly error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Quatarly error: ${response.status}`
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          const parsed = JSON.parse(data);

          // Transform Claude format to OpenAI format
          if (isClaude) {
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              const chunk = {
                choices: [{ delta: { content: parsed.delta.text }, index: 0 }]
              };
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            } else if (parsed.type === 'message_stop') {
              res.write('data: [DONE]\n\n');
            }
          } else {
            res.write(`data: ${JSON.stringify(parsed)}\n\n`);
          }
        } catch (e) {
          // Skip unparseable lines
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ error: 'Chat request failed' });
  }
});

// Conversations endpoints
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, model, agent_id, updated_at, pinned, folder_id FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.post('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const { title, model, agent_id } = req.body;
    const result = await pool.query(
      'INSERT INTO conversations (user_id, title, model, agent_id) VALUES ($1, $2, $3, $4) RETURNING id, title, model, agent_id, updated_at',
      [req.user.id, title, model, agent_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

app.delete('/api/conversations/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Messages endpoints
app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    // Verify conversation belongs to user
    const convCheck = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await pool.query(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { role, content } = req.body;

    // Verify conversation belongs to user
    const convCheck = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const result = await pool.query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at',
      [req.params.id, role, content]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
