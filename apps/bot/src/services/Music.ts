// apps/bot/src/services/Music.ts
import {
	GuildQueue,
	Player,
	QueueRepeatMode,
	Track,
} from 'discord-player'
import {
	Client,
	Guild,
	GuildMember,
	PermissionsBitField,
	VoiceBasedChannel,
} from 'discord.js'

import { Service } from '@/decorators'
import { GuildMusicConfig } from '@/entities/GuildMusicConfig'
import { Database } from '@/services/Database'
import { SocketService } from '@/services/Socket'
import { resolveDependency } from '@/utils/functions'
import type {
	GuildPlayerState,
	PlayerControlAction,
	SerializedTrack,
} from '@musicbot/shared'

export interface VoiceVerificationResult {
	authorized: boolean
	error?: string
	guild?: Guild
	member?: GuildMember
	voiceChannel?: VoiceBasedChannel
	botVoiceChannel?: VoiceBasedChannel | null
}

@Service()
export class MusicService {

	private player: Player | null = null
	private isInitialized = false

	constructor(
		private readonly socketService: SocketService
	) {}

	/**
	 * Lazily initialize discord-player v6 with DefaultExtractors and event listeners.
	 */
	public async initialize(): Promise<Player> {
		if (this.player && this.isInitialized)
			return this.player

		try {
			const client = await resolveDependency(Client)

			this.player = new Player(client as unknown as Client<true>, {
				skipFFmpeg: false,
			})

			await this.player.extractors.loadDefault()
			this.registerPlayerEvents(this.player)
			this.isInitialized = true

			console.log('[MusicService] discord-player v6 initialized with default extractors.')
			return this.player
		}
		catch (error) {
			console.error('[MusicService] Error initializing discord-player:', error)
			throw error
		}
	}

	/**
	 * Ensure the player instance is ready for commands and actions.
	 */
	private async getPlayer(): Promise<Player> {
		if (!this.player || !this.isInitialized)
			return this.initialize()

		return this.player
	}

	/**
	 * Hook discord-player lifecycle events to real-time WebSocket state broadcasts.
	 * @param player Main audio Player instance
	 */
	private registerPlayerEvents(player: Player): void {
		player.events.on('playerStart', (queue: GuildQueue, track: Track) => {
			console.log(`[MusicService] [${queue.guild.name}] Started: "${track.title}"`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('audioTrackAdd', (queue: GuildQueue, track: Track) => {
			console.log(`[MusicService] [${queue.guild.name}] Track queued: "${track.title}"`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('audioTracksAdd', (queue: GuildQueue, tracks: Track[]) => {
			console.log(`[MusicService] [${queue.guild.name}] ${tracks.length} tracks queued`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('playerSkip', (queue: GuildQueue, track: Track) => {
			console.log(`[MusicService] [${queue.guild.name}] Skipped: "${track.title}"`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('playerPause', (queue: GuildQueue) => {
			console.log(`[MusicService] [${queue.guild.name}] Playback paused`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('playerResume', (queue: GuildQueue) => {
			console.log(`[MusicService] [${queue.guild.name}] Playback resumed`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('disconnect', (queue: GuildQueue) => {
			console.log(`[MusicService] [${queue.guild.name}] Voice channel disconnected`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('emptyQueue', (queue: GuildQueue) => {
			console.log(`[MusicService] [${queue.guild.name}] Queue finished / empty`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('playerFinish', (queue: GuildQueue, track: Track) => {
			console.log(`[MusicService] [${queue.guild.name}] Finished track: "${track.title}"`)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('error', (queue: GuildQueue, error: Error) => {
			console.error(`[MusicService] [${queue.guild.name}] GuildQueue error:`, error)
			this.broadcastState(queue.guild.id)
		})

		player.events.on('playerError', (queue: GuildQueue, error: Error) => {
			console.error(`[MusicService] [${queue.guild.name}] AudioPlayer error:`, error)
			this.broadcastState(queue.guild.id)
		})
	}

	/**
	 * Verify that the user is connected to voice and authorized to control playback.
	 * Enforces the Voice Channel Security Rule:
	 * 1. User must be in a voice channel in the specified guild.
	 * 2. If the bot is already connected in that guild, the user must be in the exact same channel
	 *    (unless they have ManageGuild permission or the configured DJ role).
	 * @param guildId Discord Guild ID
	 * @param userId Discord User ID
	 */
	public async verifyMemberVoice(guildId: string, userId: string): Promise<VoiceVerificationResult> {
		try {
			const client = await resolveDependency(Client)
			const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId).catch(() => null)

			if (!guild) {
				return {
					authorized: false,
					error: 'Discord server not found or bot is not a member.',
				}
			}

			const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null)
			if (!member) {
				return {
					authorized: false,
					error: 'User is not a member of this server.',
				}
			}

			const voiceState = guild.voiceStates.cache.get(userId) ?? member.voice
			const userVoiceChannelId = voiceState?.channelId
			const userVoiceChannel = (voiceState?.channel ?? (userVoiceChannelId ? await guild.channels.fetch(userVoiceChannelId).catch(() => null) : null)) as VoiceBasedChannel | null

			if (!userVoiceChannel) {
				return {
					authorized: false,
					error: 'You must be connected to an active voice channel in this server to control playback.',
				}
			}

			const botMember = guild.members.me ?? (client.user ? await guild.members.fetch(client.user.id).catch(() => null) : null)
			const botVoiceState = (client.user ? guild.voiceStates.cache.get(client.user.id) : null) ?? botMember?.voice
			const botVoiceChannel = (botVoiceState?.channel ?? (botVoiceState?.channelId ? await guild.channels.fetch(botVoiceState.channelId).catch(() => null) : null)) as VoiceBasedChannel | null

			// If the bot is already active in a channel, verify same-channel or DJ permissions
			if (botVoiceChannel && botVoiceChannel.id !== userVoiceChannel.id) {
				const hasManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild)
				let hasDjRole = false

				try {
					const db = await resolveDependency(Database) as Database
					const config = await db.get(GuildMusicConfig).findOne({ guildId })
					if (config?.djRoleId)
						hasDjRole = member.roles.cache.has(config.djRoleId)
				}
				catch (dbErr) {
					console.warn(`[MusicService] Could not check DJ role for guild ${guildId}:`, dbErr)
				}

				if (!hasManageGuild && !hasDjRole) {
					return {
						authorized: false,
						error: 'You must be in the same voice channel as the bot to control playback.',
					}
				}
			}

			return {
				authorized: true,
				guild,
				member,
				voiceChannel: userVoiceChannel,
				botVoiceChannel,
			}
		}
		catch (error) {
			console.error(`[MusicService] verifyMemberVoice error (${guildId}, ${userId}):`, error)
			return {
				authorized: false,
				error: 'An internal error occurred while validating voice channel permissions.',
			}
		}
	}

	/**
	 * Execute a PlayerControlAction requested by a user or dashboard controller.
	 * Enforces voice channel checks and broadcasts the updated state.
	 * @param guildId Discord Guild ID
	 * @param action Player control payload
	 */
	public async executeAction(guildId: string, action: PlayerControlAction): Promise<GuildPlayerState> {
		const player = await this.getPlayer()

		const auth = await this.verifyMemberVoice(guildId, action.userId)
		if (!auth.authorized || !auth.member || !auth.voiceChannel)
			throw new Error(auth.error || 'Voice authorization failed.')

		const queue = player.nodes.get(guildId)

		switch (action.action) {
			case 'play': {
				let defaultVolume = 100
				let twentyFourSeven = false

				try {
					const db = await resolveDependency(Database) as Database
					const config = await db.get(GuildMusicConfig).findOne({ guildId })
					if (config) {
						defaultVolume = config.defaultVolume ?? 100
						twentyFourSeven = config.twentyFourSeven ?? false
					}
				}
				catch (err) {
					console.warn(`[MusicService] Could not retrieve GuildMusicConfig for ${guildId}:`, err)
				}

				console.log(`[MusicService] Playing "${action.query}" in guild ${guildId} (channel: ${auth.voiceChannel.name})...`)

				const playResult = await player.play(auth.voiceChannel, action.query, {
					nodeOptions: {
						metadata: {
							voiceChannel: auth.voiceChannel,
							member: auth.member,
						},
						volume: defaultVolume,
						leaveOnEmpty: !twentyFourSeven,
						leaveOnEmptyCooldown: 300000,
						leaveOnEnd: !twentyFourSeven,
						leaveOnEndCooldown: 300000,
					},
					requestedBy: auth.member.user,
				})

				const trackTitle = playResult.track?.title ?? action.query
				console.log(`[MusicService] Successfully queued: "${trackTitle}"`)
				break
			}

			case 'pause': {
				if (!queue || !queue.isPlaying())
					throw new Error('No audio is currently playing to pause.')

				queue.node.setPaused(true)
				break
			}

			case 'resume': {
				if (!queue)
					throw new Error('No active queue found to resume.')

				queue.node.setPaused(false)
				break
			}

			case 'skip': {
				if (!queue || !queue.isPlaying())
					throw new Error('No audio is currently playing to skip.')

				queue.node.skip()
				break
			}

			case 'stop': {
				if (!queue)
					throw new Error('No active queue found to stop.')

				queue.delete()
				break
			}

			case 'shuffle': {
				if (!queue || queue.tracks.size === 0)
					throw new Error('The queue is empty; cannot shuffle.')

				queue.tracks.shuffle()
				break
			}

			case 'volume': {
				if (!queue)
					throw new Error('No active queue found to adjust volume.')

				const targetVolume = Math.max(0, Math.min(100, Math.round(action.value)))
				queue.node.setVolume(targetVolume)
				break
			}

			case 'loop': {
				if (!queue)
					throw new Error('No active queue found to set repeat mode.')

				const modeMap: Record<number, QueueRepeatMode> = {
					0: QueueRepeatMode.OFF,
					1: QueueRepeatMode.TRACK,
					2: QueueRepeatMode.QUEUE,
					3: QueueRepeatMode.AUTOPLAY,
				}
				queue.setRepeatMode(modeMap[action.mode] ?? QueueRepeatMode.OFF)
				break
			}

			case 'seek': {
				if (!queue || !queue.currentTrack)
					throw new Error('No track is currently playing to seek.')

				if (action.positionMS < 0 || action.positionMS > queue.currentTrack.durationMS)
					throw new Error('Seek position is outside the current track duration boundaries.')

				await queue.node.seek(action.positionMS)
				break
			}

			case 'removeTrack': {
				if (!queue)
					throw new Error('No active queue found.')

				const tracks = queue.tracks.toArray()
				if (action.trackIndex < 0 || action.trackIndex >= tracks.length)
					throw new Error(`Track index ${action.trackIndex} is out of bounds.`)

				const trackToRemove = tracks[action.trackIndex]
				if (trackToRemove)
					queue.removeTrack(trackToRemove)

				break
			}

			case 'jumpTo': {
				if (!queue)
					throw new Error('No active queue found.')

				const tracks = queue.tracks.toArray()
				if (action.trackIndex < 0 || action.trackIndex >= tracks.length)
					throw new Error(`Track index ${action.trackIndex} is out of bounds.`)

				const targetTrack = tracks[action.trackIndex]
				if (targetTrack) {
					const nodeWithJump = queue.node as unknown as { jump?: (track: Track) => boolean }
					if (typeof nodeWithJump.jump === 'function') {
						nodeWithJump.jump(targetTrack)
					}
					else {
						for (let i = 0; i < action.trackIndex; i++) {
							const precedingTrack = queue.tracks.toArray()[0]
							if (precedingTrack)
								queue.removeTrack(precedingTrack)
						}
						queue.node.skip()
					}
				}
				break
			}

			default: {
				const exhaustive: never = action
				throw new Error(`Unsupported action: ${(exhaustive as { action: string }).action}`)
			}
		}

		const updatedState = this.getSerializedState(guildId)
		this.socketService.emitPlayerState(guildId, updatedState)
		return updatedState
	}

	/**
	 * Retrieve the single source of truth serialized player state for a guild.
	 * @param guildId Discord Guild ID
	 */
	public getSerializedState(guildId: string): GuildPlayerState {
		const queue = this.player?.nodes.get(guildId)

		if (!queue || !queue.connection) {
			return {
				guildId,
				isPlaying: false,
				isPaused: false,
				volume: 100,
				repeatMode: 0,
				position: 0,
				duration: 0,
				voiceChannelId: null,
				voiceChannelName: null,
				currentTrack: null,
				queue: [],
				updatedAt: Date.now(),
			}
		}

		const currentTrack = queue.currentTrack ? this.serializeTrack(queue.currentTrack) : null
		const serializedQueue = queue.tracks
			.toArray()
			.map(t => this.serializeTrack(t))
			.filter((t): t is SerializedTrack => t !== null)

		const rawRepeatMode = queue.repeatMode
		const repeatMode: 0 | 1 | 2 | 3 = (rawRepeatMode >= 0 && rawRepeatMode <= 3)
			? (rawRepeatMode as 0 | 1 | 2 | 3)
			: 0

		return {
			guildId,
			isPlaying: queue.isPlaying(),
			isPaused: queue.node.isPaused(),
			volume: queue.node.volume,
			repeatMode,
			position: queue.node.playbackTime || 0,
			duration: queue.currentTrack?.durationMS || 0,
			voiceChannelId: queue.channel?.id ?? null,
			voiceChannelName: queue.channel?.name ?? null,
			currentTrack,
			queue: serializedQueue,
			updatedAt: Date.now(),
		}
	}

	/**
	 * Convert a discord-player Track into the strictly-typed SerializedTrack format.
	 * @param track discord-player Track
	 */
	private serializeTrack(track: Track | null): SerializedTrack | null {
		if (!track)
			return null

		let requestedBy: SerializedTrack['requestedBy'] = null
		if (track.requestedBy) {
			const req = track.requestedBy
			requestedBy = {
				id: req.id,
				username: req.username,
				avatar: typeof req.displayAvatarURL === 'function' ? req.displayAvatarURL() : undefined,
			}
		}

		return {
			id: track.id || track.url,
			title: track.title,
			author: track.author,
			duration: track.duration,
			durationMS: track.durationMS,
			thumbnail: track.thumbnail,
			url: track.url,
			requestedBy,
		}
	}

	/**
	 * Broadcast the updated player state to the guild's Socket.io room.
	 * @param guildId Discord Guild ID
	 */
	public broadcastState(guildId: string): void {
		const state = this.getSerializedState(guildId)
		this.socketService.emitPlayerState(guildId, state)
	}

	/**
	 * Helper method to access an active GuildQueue.
	 * @param guildId Discord Guild ID
	 */
	public getQueue(guildId: string): GuildQueue | null {
		return this.player?.nodes.get(guildId) ?? null
	}

}
