# Discord Music Bot & Live Web Dashboard Monorepo

A production-ready Discord Music Bot and real-time Live Web Dashboard built with a modern TypeScript monorepo architecture.

---

## 🏗️ Architecture Overview

```text
/
├── packages/
│   └── shared/                 # Shared TypeScript interfaces & real-time state contracts
│       ├── src/music.ts        # GuildPlayerState, SerializedTrack, PlayerControlAction
│       └── src/index.ts
├── apps/
│   ├── bot/                    # TSCord Discord Bot + Internal API + Socket.io Server
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── controllers/music.ts    # REST endpoints protected with API_ADMIN_TOKEN
│   │   │   │   └── middlewares/authenticated.ts
│   │   │   ├── commands/Music/
│   │   │   │   ├── play.ts                 # /play <query>
│   │   │   │   ├── controls.ts             # /pause, /resume, /skip, /stop, /shuffle, /volume, /loop
│   │   │   │   └── queue.ts                # /queue, /nowplaying, /remove, /jump
│   │   │   ├── entities/
│   │   │   │   ├── GuildMusicConfig.ts     # MikroORM entity (DJ role, default volume, 24/7)
│   │   │   │   └── Playlist.ts             # MikroORM entity (Saved playlists)
│   │   │   ├── guards/
│   │   │   │   └── InVoiceChannel.ts       # discordx voice guard
│   │   │   ├── services/
│   │   │   │   ├── Music.ts                # discord-player v6 manager + voice verification
│   │   │   │   └── Socket.ts               # socket.io server with guild rooms
│   │   │   └── client.ts                   # Gateway intents (GuildVoiceStates)
│   └── web/                    # Next.js 15 App Router Live Dashboard
│       └── src/
│           ├── app/
│           │   ├── api/auth/[...nextauth]/route.ts  # Discord OAuth2 (identify, guilds)
│           │   ├── api/music/[guildId]/route.ts     # Server proxy to bot internal API
│           │   ├── dashboard/
│           │   │   ├── page.tsx                     # Mutual guild selector & invite links
│           │   │   └── [guildId]/page.tsx           # Live player room
│           ├── components/
│           │   ├── PlayerCard.tsx                   # Live player, seek bar, transport controls
│           │   ├── TrackSearch.tsx                  # Instant search & URL addition
│           │   ├── QueueList.tsx                    # Up-next list, jump to track, remove
│           │   └── Navbar.tsx                       # User profile & navigation
│           └── hooks/
│               └── useGuildPlayer.ts                # Socket.io sync + 250ms progress interpolation
```

---

## ⚡ Tech Stack

- **Audio Engine:** `discord-player` v6+ with `@discord-player/extractor` and `@discordjs/voice`.
- **Bot Framework:** `TSCord` (`discord.js` v14, `discordx`, `tsyringe` DI, `MikroORM`).
- **Dashboard Framework:** `Next.js 15` (App Router, React 19, Server Components).
- **Authentication:** `Auth.js` (`next-auth`) with Discord OAuth2 provider.
- **Real-Time State:** `Socket.io` attached to TSCord's underlying HTTP server + `socket.io-client` with client-side 250ms position interpolation.
- **Styling:** `Tailwind CSS`, `lucide-react`, dark theme inspired by Spotify Web & Vercel Geist.

---

## 🔐 Security & Voice Channel Enforcement

1. **Zero Secret Leakage:**
   The browser client **never** talks to the internal Bot API directly and never possesses `BOT_API_ADMIN_TOKEN`. All commands route through Next.js Route Handlers (`/api/music/[guildId]`) that authenticate the user's Discord session and inject their `userId`.
2. **Discord Voice Channel Guard:**
   Before executing any control action (`POST /music/:guildId/control`), the Bot API verifies that:
   - The user is actively connected to a voice channel in that guild.
   - The user is in the **exact same** voice channel as the bot (or holds Administrator / DJ permissions).
   - If unauthorized, the bot rejects the request with HTTP `403 Forbidden`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** `v20.0.0` or higher (Node.js 22 LTS or 24/26 recommended).
- **pnpm** `v9.0.0` or higher (`npm install -g pnpm`).
- A **Discord Application & Bot** created on the [Discord Developer Portal](https://discord.com/developers/applications).

### 2. Discord Developer Portal Setup
1. In your Discord Application, navigate to the **Bot** tab:
   - Enable **Privileged Gateway Intents**:
     - `SERVER MEMBERS INTENT`
     - `MESSAGE CONTENT INTENT`
   - Copy the **Bot Token**.
2. Navigate to the **OAuth2** tab:
   - Copy the **Client ID** and **Client Secret**.
   - Add the following **Redirect URI**:
     ```text
     http://localhost:3000/api/auth/callback/discord
     ```

### 3. Environment Configuration

#### A. Configure the Bot (`apps/bot/.env`)
Copy the example file:
```bash
cp apps/bot/.env.example apps/bot/.env
```
Fill in the credentials:
```env
BOT_TOKEN="your_discord_bot_token"
BOT_OWNER_ID="your_discord_user_id"
TEST_GUILD_ID="your_development_guild_id"

API_PORT=4000
API_ADMIN_TOKEN="super_secret_bot_api_admin_token_change_me"
FRONTEND_URL="http://localhost:3000"
```

#### B. Configure the Web Dashboard (`apps/web/.env.local`)
Copy the example file:
```bash
cp apps/web/.env.example apps/web/.env.local
```
Fill in the credentials:
```env
DISCORD_CLIENT_ID="your_discord_client_id"
DISCORD_CLIENT_SECRET="your_discord_client_secret"
NEXTAUTH_SECRET="your_random_32_char_secret_string"
NEXTAUTH_URL="http://localhost:3000"

INTERNAL_BOT_API_URL="http://127.0.0.1:4000"
BOT_API_ADMIN_TOKEN="super_secret_bot_api_admin_token_change_me" # must match apps/bot/.env
NEXT_PUBLIC_BOT_SOCKET_URL="http://localhost:4000"
```

---

## 📦 Installation & Build

```bash
# Install all dependencies across the monorepo
pnpm install

# Build shared contracts
pnpm --filter "@musicbot/shared" run build

# Type check all workspaces
pnpm type:check
```

---

## 🏃 Running in Development

In two separate terminals:

### Terminal 1: Discord Bot
```bash
pnpm --filter "@musicbot/bot" run dev
```

### Terminal 2: Web Dashboard
```bash
pnpm --filter "@musicbot/web" run dev
```

Now open [http://localhost:3000](http://localhost:3000) in your browser:
1. Log in with your Discord account.
2. Select any server from the **Active Servers** list.
3. Join a voice channel in Discord and enjoy the real-time player!

---

## 🎵 Discord Slash Commands

| Command | Arguments | Description |
|---|---|---|
| `/play` | `query: string` | Plays a track from a search query or URL (Spotify, YouTube, SoundCloud) |
| `/pause` | - | Pauses the current track |
| `/resume` | - | Resumes playback |
| `/skip` | - | Skips to the next track |
| `/stop` | - | Stops music and disconnects from the voice channel |
| `/shuffle` | - | Shuffles the current queue |
| `/volume` | `value: 0-100` | Sets playback volume |
| `/loop` | `mode: off/track/queue/autoplay` | Sets repeat / autoplay mode |
| `/nowplaying` | - | Shows the current playing track with a visual progress bar |
| `/queue` | - | Displays the up-next track queue |
| `/jump` | `track: number` | Jumps straight to a specific track index in queue |
| `/remove` | `track: number` | Removes a track from the queue |

---

## 📄 License
MIT
