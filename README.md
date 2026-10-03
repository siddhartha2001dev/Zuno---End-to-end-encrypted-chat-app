<div align="center">

# 💬 Zuno Chat

### Modern, Secure, Real-Time Messaging Platform with Liquid Glassmorphism UI

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br />

**Zuno Chat** is a high-performance, real-time messaging application engineered with modern web standards. Built with a stunning **Liquid Glass** aesthetic, Brevo email verification security, Cloudinary media hosting, Web Crypto client-side security, and full PWA capabilities.

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Environment Setup](#-environment-variables) • [API Reference](#-api-reference)

---

</div>

## ✨ Features

- 🔐 **Strict Email Verification via Brevo**: 
  - Zero-backdoor security: users *must* verify their account via the transactional verification link sent to their inbox before they can access any chat or API endpoint.
  - Auto-login token flow upon clicking the email verification link.
- ⚡ **Real-Time Communication (Socket.IO)**:
  - Instant direct messages (1-on-1) and group conversations.
  - Live typing indicators ("*User is typing...*").
  - Real-time online/offline presence tracking.
  - Message read/delivered status ticks.
- 😀 **Interactive Emoji Picker**:
  - Full-featured custom emoji picker with 6 categorized collections (Smileys, Gestures, Hearts, Animals, Food, Objects).
  - Smart keyword search (e.g. *smile*, *heart*, *party*, *dog*, *coffee*).
  - Frequently used / recents memory with local persistence.
  - Cursor-aware emoji insertion that preserves input focus.
- 🎨 **Liquid Glassmorphism UI & Dual Themes**:
  - Crisp, modern dark and light mode themes with smooth transitions.
  - Tailored color palette using Plus Jakarta Sans typography.
  - Subtle micro-animations on message arrival, emoji reactions, and modal triggers.
  - Animated SVG default avatars with glowing aura effects.
- 👤 **Customizable User Profile & Persona Avatars**:
  - **Interactive Avatar Selector**: Choose from 8 animated character archetypes (*Cyber Bot*, *Cosmo Kitty*, *Astronaut*, *Boba Panda*, *Spark Star*, *Cosmic Fox*, *Pixel Gamer*, *Solar Lion*).
  - **6 Glowing Aura Themes**: Match your avatar with Emerald, Cyan, Violet, Amber, Pink, or Mint gradients.
  - **24 Iconic Gradient Emblems**: Fire, Lightning, Crown, Rocket, Diamond, Gaming, and more.
  - **Custom Photo Upload & Crop**: Upload personal photos with full zoom, rotation, and square/circle cropping.
  - Real-time account name editing (`PUT /api/users/name`).
  - Unique `@chatId` handles with one-click copy to clipboard.
- 📎 **Rich Media & File Attachments**:
  - Upload photos and documents directly into chat conversations.
  - Instant file preview card before sending.
  - Cloudinary CDN media delivery with safe size boundaries (up to 25MB).
- 📲 **Progressive Web App (PWA)**:
  - Installable directly to home screens on iOS, Android, macOS, and Windows.
  - Service worker background registration and app manifest configured.
- 🐳 **Dockerized Deployment**:
  - Full multi-container configuration via Docker Compose (Frontend with Nginx, Node.js Backend, and MongoDB).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + Vanilla CSS design system
- **Icons**: [Lucide React](https://lucide.dev/)
- **Real-Time**: [Socket.IO Client](https://socket.io/)
- **Animations**: CSS Keyframes + Canvas Confetti

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Framework**: [Express 4](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Real-Time Engine**: [Socket.IO](https://socket.io/)
- **Email Service**: [Brevo (Sendinblue) REST API](https://www.brevo.com/)
- **Media Storage**: [Cloudinary SDK](https://cloudinary.com/)
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs

### Infrastructure
- **Containerization**: [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- **Web Server**: Nginx (Frontend production bundle reverse proxy)

---

## 🚀 Quick Start

### Option 1: Run with Docker Compose (Recommended)

Make sure you have [Docker](https://www.docker.com/) installed and running.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/zuno-chat.git
   cd zuno-chat
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Open .env and add your MongoDB, Cloudinary, and Brevo credentials
   ```

3. **Build and launch containers:**
   ```bash
   docker compose up -d --build
   ```

4. **Access the application:**
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:4000](http://localhost:4000)
   - **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

### Option 2: Run Locally for Development

#### Prerequisites
- Node.js (v20 or higher)
- npm or yarn
- MongoDB database (local MongoDB or MongoDB Atlas URI)

#### 1. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create environment configuration
cp ../.env.example .env
# Edit .env with your credentials

# Run in development mode (with hot reload)
npm run dev

# Or compile and build:
npm run build
npm start
```
*Backend will run on [http://localhost:4000](http://localhost:4000).*

#### 2. Frontend Setup
```bash
cd ../Frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev

# Or build for production:
npm run build
npm run preview
```
*Frontend will run on [http://localhost:5173](http://localhost:5173).*

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` in the root folder and configure the following variables:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `4000` |
| `MONGODB_URI` | MongoDB connection string (Atlas or Local) | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `your-secret-32-chars-long` |
| `CORS_ORIGIN` | Allowed client origin for CORS and WebSockets | `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud account name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` |
| `BREVO_API_KEY` | Brevo (Sendinblue) API v3 key | `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | Verified sender email configured in Brevo | `support@yourdomain.com` |
| `BREVO_SENDER_NAME` | Sender display name for emails | `ZunoChat` |

---

## 📡 API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create a new account and dispatch Brevo verification email.
- `POST /api/auth/login` - Authenticate user (blocks unverified accounts with HTTP 403).
- `GET /api/auth/verify-email?token=<token>` - Verify email link and receive authentication token.
- `POST /api/auth/resend-verification` - Resend verification email.

### Users (`/api/users`)
- `GET /api/users/me` - Fetch profile of currently authenticated user.
- `PUT /api/users/name` - Update user display name (2–50 characters).
- `PUT /api/users/avatar` - Set custom avatar preset or emblem configuration.
- `POST /api/users/avatar` - Upload custom avatar image via Cloudinary.
- `DELETE /api/users/avatar` - Reset avatar back to animated SVG default.
- `GET /api/users/search?q=<query>` - Search users by name or `@chatId`.
- `POST /api/users/deactivate` - Deactivate account.

### Conversations (`/api/conversations`)
- `GET /api/conversations` - List all active conversations for the authenticated user.
- `POST /api/conversations` - Create a new 1-on-1 or group conversation.
- `DELETE /api/conversations/:id` - Delete conversation and its messages.

### Messages (`/api/messages`)
- `GET /api/messages/:conversationId` - Retrieve paginated messages for a conversation.
- `POST /api/messages` - Send a text or media message.
- `POST /api/messages/upload` - Upload media attachment (photos/documents).

---

## 📂 Project Structure

```text
Chat App/
├── .env.example              # Sample environment configuration template
├── .gitignore                # Complete Git ignore specifications
├── docker-compose.yml        # Docker Compose configuration
├── README.md                 # Project documentation
├── backend/                  # Express + TypeScript Server
│   ├── src/
│   │   ├── config/           # Database, Cloudinary & Brevo configurations
│   │   ├── controllers/      # Request handlers (auth, user, message, etc.)
│   │   ├── middleware/       # JWT auth & verification middlewares
│   │   ├── models/           # Mongoose schemas (User, Message, Conversation)
│   │   ├── routes/           # REST API route handlers
│   │   ├── services/         # Business logic & mail services
│   │   ├── sockets/          # Socket.IO connection & event handlers
│   │   └── server.ts         # Server entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
└── Frontend/                 # React 19 + TypeScript + Vite Client
    ├── public/               # Favicons, Web Manifest, PWA Service Worker
    ├── src/
    │   ├── components/       # UI Components (ChatArea, EmojiPicker, Modal, etc.)
    │   ├── context/          # React Contexts (AuthContext, ChatContext)
    │   ├── crypto/           # Web Crypto API key management utilities
    │   ├── services/         # Axios API client & Socket.IO service
    │   ├── App.tsx           # Main application routing & layout
    │   ├── index.css         # Liquid Glass CSS & animation definitions
    │   └── main.tsx          # Client entrypoint
    ├── Dockerfile
    ├── nginx.conf            # Production Nginx reverse proxy configuration
    ├── package.json
    └── vite.config.ts
```

---

## 🛡️ Security Highlights

1. **Email-Verified Enclave**: Unverified users cannot bypass authentication or access WebSockets.
2. **Encrypted Passwords**: Secure hashing with bcrypt utilizing high salt factors.
3. **Protected JWT Sessions**: Short-lived cryptographic tokens required for all sensitive routes.
4. **Cloudinary Asset Sanitization**: Strict file type validation and size limits (25MB) preventing payload abuse.
5. **No Secret Leaks**: Automated `.gitignore` rules prevent accidentally committing `.env` files or certificates.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check out the issues tab or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
