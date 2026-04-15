# ChatPal Server

Express.js backend for ChatPal AI application.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Set environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Create PostgreSQL database and run schema:
```bash
psql $DATABASE_URL < schema.sql
```

4. Start server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Chat
- `POST /api/chat` - Stream chat with AI (requires auth)

### Conversations
- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations` - Create conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/conversations/:id/messages` - Add message to conversation

## Deployment to Railway

1. Create new Railway project
2. Add PostgreSQL database
3. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway)
   - `JWT_SECRET`
   - `QUATARLY_API_KEY`
4. Deploy from GitHub or CLI
