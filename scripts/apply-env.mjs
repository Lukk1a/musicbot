// scripts/apply-env.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function parseEnv(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`[Error] File not found: ${filePath}`)
		process.exit(1)
	}

	const content = fs.readFileSync(filePath, 'utf-8')
	const env = {}
	for (const line of content.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const idx = trimmed.indexOf('=')
		if (idx === -1) continue
		const key = trimmed.slice(0, idx).trim()
		let val = trimmed.slice(idx + 1).trim()
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1)
		}
		env[key] = val
	}
	return env
}

const rootEnv = parseEnv(path.join(rootDir, '.env'))

const botEnvContent = `# Auto-generated from root .env
BOT_TOKEN=${rootEnv.BOT_TOKEN || ''}
BOT_OWNER_ID=${rootEnv.BOT_OWNER_ID || ''}
TEST_GUILD_ID=${rootEnv.TEST_GUILD_ID || ''}

API_PORT=${rootEnv.API_PORT || '4000'}
API_ADMIN_TOKEN=${rootEnv.API_ADMIN_TOKEN || rootEnv.BOT_API_ADMIN_TOKEN || 'c0f98e725b914e789e123f1a2e4d5c6b'}
FRONTEND_URL=${rootEnv.FRONTEND_URL || 'https://play.lukka.dev'}
`

const webEnvContent = `# Auto-generated from root .env
DISCORD_CLIENT_ID=${rootEnv.DISCORD_CLIENT_ID || ''}
DISCORD_CLIENT_SECRET=${rootEnv.DISCORD_CLIENT_SECRET || ''}
NEXTAUTH_SECRET=${rootEnv.NEXTAUTH_SECRET || 'e6b9f2d1a3c54879b2e0f4d8a1c9e3b7'}
NEXTAUTH_URL=${rootEnv.NEXTAUTH_URL || 'https://play.lukka.dev'}

INTERNAL_BOT_API_URL=${rootEnv.INTERNAL_BOT_API_URL || 'http://bot:4000'}
BOT_API_ADMIN_TOKEN=${rootEnv.BOT_API_ADMIN_TOKEN || rootEnv.API_ADMIN_TOKEN || 'c0f98e725b914e789e123f1a2e4d5c6b'}
NEXT_PUBLIC_BOT_SOCKET_URL=${rootEnv.NEXT_PUBLIC_BOT_SOCKET_URL || 'https://play.lukka.dev'}
`

// Write locally
fs.writeFileSync(path.join(rootDir, 'apps', 'bot', '.env'), botEnvContent, 'utf-8')
fs.writeFileSync(path.join(rootDir, 'apps', 'web', '.env'), webEnvContent, 'utf-8')
console.log('✓ Updated local apps/bot/.env and apps/web/.env')

// Sync to remote server if accessible
const serverTarget = 'server@192.168.1.17'
try {
	console.log(`Syncing environment to server (${serverTarget})...`)
	execSync(`scp apps/bot/.env ${serverTarget}:~/musicbot/apps/bot/.env && scp apps/web/.env ${serverTarget}:~/musicbot/apps/web/.env`, {
		cwd: rootDir,
		stdio: 'inherit'
	})
	console.log('✓ Files copied to server')

	console.log('Recreating docker containers on server with new environment...')
	execSync(`ssh ${serverTarget} "cd ~/musicbot && docker compose up -d --force-recreate"`, {
		stdio: 'inherit'
	})
	console.log('✓ Containers restarted successfully!')
} catch (err) {
	console.error('Remote sync warning: Could not automatically update server (check SSH connection).', err.message)
}
