// apps/bot/src/services/Socket.ts
import type { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer, type Socket } from 'socket.io'

import { Service } from '@/decorators'
import type { GuildPlayerState } from '@musicbot/shared'

@Service()
export class SocketService {

	private io: SocketIOServer | null = null

	/**
	 * Attach the Socket.io server to the underlying HTTP server.
	 * @param server Node HTTP server instance
	 */
	public init(server: HttpServer): void {
		if (this.io) {
			console.warn('[SocketService] Socket.io server is already initialized.')
			return
		}

		this.io = new SocketIOServer(server, {
			cors: {
				origin: process.env.FRONTEND_URL || '*',
				methods: ['GET', 'POST'],
				credentials: true,
			},
		})

		this.setupConnectionHandlers()
		console.log('[SocketService] Socket.io server initialized and attached to HTTP server.')
	}

	/**
	 * Configure event listeners for incoming socket connections and room subscriptions.
	 */
	private setupConnectionHandlers(): void {
		if (!this.io)
			return

		this.io.on('connection', (socket: Socket) => {
			const queryGuildId = socket.handshake.query.guildId
			if (typeof queryGuildId === 'string' && queryGuildId.trim().length > 0) {
				const roomName = `guild:${queryGuildId.trim()}`
				socket.join(roomName)
				console.log(`[SocketService] Socket ${socket.id} connected and auto-joined ${roomName}`)
			}

			const handleJoin = (guildId: string) => {
				if (typeof guildId === 'string' && guildId.trim().length > 0) {
					const roomName = `guild:${guildId.trim()}`
					socket.join(roomName)
					console.log(`[SocketService] Socket ${socket.id} joined room ${roomName}`)
				}
			}

			const handleLeave = (guildId: string) => {
				if (typeof guildId === 'string' && guildId.trim().length > 0) {
					const roomName = `guild:${guildId.trim()}`
					socket.leave(roomName)
					console.log(`[SocketService] Socket ${socket.id} left room ${roomName}`)
				}
			}

			socket.on('join-guild', handleJoin)
			socket.on('join:guild', handleJoin)

			socket.on('leave-guild', handleLeave)
			socket.on('leave:guild', handleLeave)

			socket.on('disconnect', (reason: string) => {
				console.log(`[SocketService] Socket ${socket.id} disconnected: ${reason}`)
			})
		})
	}

	/**
	 * Emit real-time player state updates to the guild's dedicated room.
	 * @param guildId Discord Guild ID
	 * @param state Complete serialized guild player state
	 */
	public emitPlayerState(guildId: string, state: GuildPlayerState): void {
		if (!this.io) {
			console.warn(`[SocketService] Cannot emit player state for guild ${guildId}: Socket.io is not initialized.`)
			return
		}

		const roomName = `guild:${guildId}`
		this.io.to(roomName).emit('player:state-update', state)
	}

	/**
	 * Returns the underlying Socket.io server instance.
	 */
	public getIO(): SocketIOServer | null {
		return this.io
	}

	/**
	 * Checks if Socket.io server has been initialized.
	 */
	public isInitialized(): boolean {
		return this.io !== null
	}

}
