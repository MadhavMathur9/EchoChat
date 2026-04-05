<div align="center">
  <h1>EchoChat</h1>
  <p><strong>Real-time chat rooms with built-in AI.</strong></p>
  <p>🔴 <strong>Live Demo:</strong> <a href="https://my-echochat.netlify.app/">my-echochat.netlify.app</a></p>
</div>

<br />

## What is this?
EchoChat is a fast, real-time messaging website I built for quick collaboration. You can spin up public or private chat rooms instantly. The cool part? Google Gemini is built right in. Just type `@gemini` in any room, and the AI jumps into the chat to answer questions, brainstorm, or help out. 

Rooms are also ephemeral—if a room sits empty for 60 minutes, it automatically deletes itself to keep things clean.

## Features
- **Real-time Messaging:** Uses Spring Boot WebSockets for instant message delivery.
- **AI Integration:** Mention `@gemini` to chat with the AI. It supports full markdown formatting.
- **Private Rooms:** Lock rooms behind a password.
- **Auto-Cleanup:** Rooms are permanently deleted after 60 minutes of zero activity.
- **Clean UI:** Built with a dark-mode first design using React and Tailwind.
- **Scalable:** Uses Redis to sync messages across multiple server instances.

## Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Spring Boot 3 (Java), WebSockets (STOMP), Virtual Threads.
- **Database/Cache:** PostgreSQL & Redis.
- **AI:** Google Gemini API.

---

## Running it locally

### What you need
- Node.js (v18+)
- Java 17 or 21
- Postgres
- Redis (running on port `6379`)
- A free [Google AI Studio API Key](https://aistudio.google.com/)

### 1. Clone the repo
```bash
git clone https://github.com/MadhavMathur9/EchoChat.git
cd EchoChat
```

### 2. Start the Backend
Set up your environment variables (you can put these in your `application.properties`):

```properties
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/echochat
SPRING_DATASOURCE_USERNAME=your_db_username
SPRING_DATASOURCE_PASSWORD=your_db_password

SPRING_DATA_REDIS_HOST=localhost
SPRING_DATA_REDIS_PORT=6379

GEMINI_API_KEY=your_google_ai_studio_api_key
```

Run the Spring Boot app:
```bash
./mvnw spring-boot:run
```
*(The backend runs on `http://localhost:8080`)*

### 3. Start the Frontend
Open a new terminal and go to the frontend folder:
```bash
cd frontend
npm install
npm run dev
```
*(The frontend runs on `http://localhost:5173`)*
