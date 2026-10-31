// apps/bot/src/services/Playlist.ts
import { PermissionsBitField } from 'discord.js'
import { Client } from 'discordx'
import { v4 as uuidv4 } from 'uuid'

import { Service } from '@/decorators'
import { GuildMusicConfig, ServerPlaylist } from '@/entities'
import { Database } from '@/services/Database'
import { MusicService } from '@/services/Music'
import { resolveDependency } from '@/utils/functions'
import type {
	GuildMusicConfigData,
	GuildPlayerState,
	ServerPlaylistTrack,
} from '@musicbot/shared'

@Service()
export class PlaylistService {

	constructor(
		private readonly db: Database,
		private readonly musicService: MusicService
	) {}

	private async checkPermissions(guildId: string, userId: string) {
		const client = await resolveDependency(Client)
		const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId).catch(() => null)
		if (!guild) {
			throw new Error('Discord server not found or bot is not a member.')
		}

		const member = guild.members.cache.get(userId) ?? await guild.members.fetch(userId).catch(() => null)
		if (!member) {
			throw new Error('User is not a member of this server.')
		}

		const hasManageGuild = member.permissions.has(PermissionsBitField.Flags.ManageGuild)
			|| member.permissions.has(PermissionsBitField.Flags.Administrator)

		let config = await this.db.get(GuildMusicConfig).findOne({ guildId })
		if (!config) {
			config = new GuildMusicConfig(guildId)
			await this.db.em.persistAndFlush(config)
		}

		const hasDjRole = Boolean(config.djRoleId && member.roles.cache.has(config.djRoleId))
		const hasEditorRole = Boolean(config.playlistEditorRoleId && member.roles.cache.has(config.playlistEditorRoleId))

		return {
			guild,
			member,
			config,
			hasManageGuild,
			hasDjRole,
			hasEditorRole,
			canManageServer: hasManageGuild,
			canEditPlaylists: hasManageGuild || hasDjRole || hasEditorRole,
			allowPublicContributions: config.allowPublicContributions ?? false,
		}
	}

	/**
	 * Get the music configuration for a guild.
	 */
	public async getGuildConfig(guildId: string): Promise<GuildMusicConfigData> {
		let config = await this.db.get(GuildMusicConfig).findOne({ guildId })
		if (!config) {
			config = new GuildMusicConfig(guildId)
			await this.db.em.persistAndFlush(config)
		}

		return {
			guildId: config.guildId,
			djRoleId: config.djRoleId ?? null,
			playlistEditorRoleId: config.playlistEditorRoleId ?? null,
			allowPublicContributions: config.allowPublicContributions ?? false,
			defaultVolume: config.defaultVolume ?? 100,
			twentyFourSeven: config.twentyFourSeven ?? false,
			textChannelId: config.textChannelId ?? null,
		}
	}

	/**
	 * Update the music and playlist configuration for a guild.
	 * Requires ManageGuild permission.
	 */
	public async updateGuildConfig(
		guildId: string,
		userId: string,
		updates: Partial<GuildMusicConfigData>
	): Promise<GuildMusicConfigData> {
		const perms = await this.checkPermissions(guildId, userId)
		if (!perms.canManageServer) {
			throw new Error('You need Manage Server permissions to update music configuration.')
		}

		const config = perms.config
		if (updates.djRoleId !== undefined)
			config.djRoleId = updates.djRoleId
		if (updates.playlistEditorRoleId !== undefined)
			config.playlistEditorRoleId = updates.playlistEditorRoleId
		if (updates.allowPublicContributions !== undefined)
			config.allowPublicContributions = updates.allowPublicContributions
		if (updates.defaultVolume !== undefined)
			config.defaultVolume = updates.defaultVolume
		if (updates.twentyFourSeven !== undefined)
			config.twentyFourSeven = updates.twentyFourSeven
		if (updates.textChannelId !== undefined)
			config.textChannelId = updates.textChannelId

		await this.db.em.persistAndFlush(config)
		return this.getGuildConfig(guildId)
	}

	/**
	 * Automatically repair any tracks with placeholder metadata on-the-fly.
	 */
	private async repairPlaylistTracks(playlist: ServerPlaylist): Promise<boolean> {
		let modified = false
		for (const track of playlist.tracks) {
			const isPlaceholder = !track.thumbnail
				|| track.durationMS <= 0
				|| track.author === 'Added via Search'
				|| track.duration === '--:--'
				|| !track.author

			if (isPlaceholder) {
				try {
					const queryToResolve = track.url || track.title
					const resolved = await this.musicService.resolveTrack(queryToResolve)
					if (resolved) {
						track.title = resolved.title
						track.author = resolved.author
						track.duration = resolved.duration
						track.durationMS = resolved.durationMS
						track.thumbnail = resolved.thumbnail
						track.url = resolved.url
						modified = true
					}
				}
				catch {
					// Ignore resolution failure on background repair
				}
			}
		}

		if (modified) {
			await this.db.em.persistAndFlush(playlist)
		}
		return modified
	}

	/**
	 * List all Server Mix playlists for a guild, auto-repairing placeholder tracks.
	 */
	public async getPlaylists(guildId: string): Promise<ServerPlaylist[]> {
		const playlists = await this.db.get(ServerPlaylist).find({ guildId }, {
			orderBy: { updatedAt: 'DESC' },
		})

		for (const pl of playlists) {
			await this.repairPlaylistTracks(pl).catch(() => false)
		}

		return playlists
	}

	/**
	 * Get a specific playlist by ID, auto-repairing placeholder tracks.
	 */
	public async getPlaylist(guildId: string, playlistId: string): Promise<ServerPlaylist | null> {
		const playlist = await this.db.get(ServerPlaylist).findOne({ guildId, id: playlistId })
		if (playlist) {
			await this.repairPlaylistTracks(playlist).catch(() => false)
		}
		return playlist
	}

	/**
	 * Create a new Server Mix playlist.
	 */
	public async createPlaylist(
		guildId: string,
		userId: string,
		username: string,
		avatar: string | undefined,
		name: string,
		description?: string
	): Promise<ServerPlaylist> {
		const perms = await this.checkPermissions(guildId, userId)
		if (!perms.canEditPlaylists && !perms.allowPublicContributions) {
			throw new Error('You do not have permission to create server playlists.')
		}

		const trimmedName = name.trim()
		if (!trimmedName) {
			throw new Error('Playlist name cannot be empty.')
		}

		const playlist = new ServerPlaylist(
			guildId,
			trimmedName,
			{
				id: userId,
				username,
				avatar,
			},
			description?.trim() || null,
			[]
		)

		await this.db.em.persistAndFlush(playlist)
		return playlist
	}

	/**
	 * Delete a Server Mix playlist.
	 */
	public async deletePlaylist(guildId: string, playlistId: string, userId: string): Promise<boolean> {
		const perms = await this.checkPermissions(guildId, userId)
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		const isCreator = playlist.createdBy.id === userId
		if (!isCreator && !perms.canEditPlaylists) {
			throw new Error('You do not have permission to delete this playlist.')
		}

		await this.db.em.removeAndFlush(playlist)
		return true
	}

	/**
	 * Add songs from a query or link (including full Spotify/YouTube playlists/albums) to a Server Mix.
	 */
	public async addQueryOrLink(
		guildId: string,
		playlistId: string,
		userId: string,
		username: string,
		avatar: string | undefined,
		queryOrLink: string
	): Promise<{ playlist: ServerPlaylist; addedCount: number; isPlaylist: boolean; title?: string }> {
		const perms = await this.checkPermissions(guildId, userId)
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		const isCreator = playlist.createdBy.id === userId
		if (!perms.allowPublicContributions && !isCreator && !perms.canEditPlaylists) {
			throw new Error('You do not have permission to add tracks to this playlist.')
		}

		const resolved = await this.musicService.resolveTracks(queryOrLink, 100)
		if (!resolved.tracks.length) {
			throw new Error(`Could not find any playable songs for "${queryOrLink}". Please verify the link or query.`)
		}

		const now = Date.now()
		const newTracks: ServerPlaylistTrack[] = resolved.tracks.map(t => ({
			id: uuidv4(),
			title: t.title,
			author: t.author,
			duration: t.duration,
			durationMS: t.durationMS,
			thumbnail: t.thumbnail,
			url: t.url,
			addedBy: {
				id: userId,
				username,
				avatar,
			},
			addedAt: now,
		}))

		playlist.tracks.push(...newTracks)
		await this.db.em.persistAndFlush(playlist)

		return {
			playlist,
			addedCount: newTracks.length,
			isPlaylist: resolved.isPlaylist,
			title: resolved.title || newTracks[0]?.title,
		}
	}

	/**
	 * Add multiple tracks to a Server Mix playlist in batch.
	 */
	public async addTracks(
		guildId: string,
		playlistId: string,
		userId: string,
		username: string,
		avatar: string | undefined,
		tracks: Array<Omit<ServerPlaylistTrack, 'id' | 'addedBy' | 'addedAt'>>
	): Promise<{ playlist: ServerPlaylist; addedCount: number }> {
		const perms = await this.checkPermissions(guildId, userId)
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		const isCreator = playlist.createdBy.id === userId
		if (!perms.allowPublicContributions && !isCreator && !perms.canEditPlaylists) {
			throw new Error('You do not have permission to add tracks to this playlist.')
		}

		if (!tracks.length) {
			throw new Error('No tracks provided.')
		}

		const now = Date.now()
		const newTracks: ServerPlaylistTrack[] = tracks.map(t => ({
			id: uuidv4(),
			title: t.title,
			author: t.author,
			duration: t.duration,
			durationMS: t.durationMS,
			thumbnail: t.thumbnail,
			url: t.url,
			addedBy: {
				id: userId,
				username,
				avatar,
			},
			addedAt: now,
		}))

		playlist.tracks.push(...newTracks)
		await this.db.em.persistAndFlush(playlist)

		return {
			playlist,
			addedCount: newTracks.length,
		}
	}

	/**
	 * Add a track to a Server Mix playlist with automatic metadata resolution.
	 */
	public async addTrack(
		guildId: string,
		playlistId: string,
		userId: string,
		username: string,
		avatar: string | undefined,
		track: Omit<ServerPlaylistTrack, 'id' | 'addedBy' | 'addedAt'>
	): Promise<ServerPlaylist> {
		const perms = await this.checkPermissions(guildId, userId)
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		const isCreator = playlist.createdBy.id === userId
		if (!perms.allowPublicContributions && !isCreator && !perms.canEditPlaylists) {
			throw new Error('You do not have permission to add tracks to this playlist.')
		}

		let finalTitle = track.title
		let finalAuthor = track.author
		let finalDuration = track.duration
		let finalDurationMS = track.durationMS
		let finalThumbnail = track.thumbnail
		let finalUrl = track.url

		// If metadata is incomplete (placeholder values or raw search queries), resolve real song metadata
		const isPlaceholder = !finalThumbnail
			|| finalDurationMS <= 0
			|| finalAuthor === 'Added via Search'
			|| finalDuration === '--:--'
			|| !finalAuthor

		if (isPlaceholder) {
			try {
				const queryToResolve = finalUrl || finalTitle
				const resolved = await this.musicService.resolveTrack(queryToResolve)
				if (resolved) {
					finalTitle = resolved.title
					finalAuthor = resolved.author
					finalDuration = resolved.duration
					finalDurationMS = resolved.durationMS
					finalThumbnail = resolved.thumbnail
					finalUrl = resolved.url
				}
			}
			catch (resolveErr) {
				console.warn(`[PlaylistService] Could not resolve metadata for "${track.title}":`, resolveErr)
			}
		}

		const newTrack: ServerPlaylistTrack = {
			id: uuidv4(),
			title: finalTitle,
			author: finalAuthor,
			duration: finalDuration,
			durationMS: finalDurationMS,
			thumbnail: finalThumbnail,
			url: finalUrl,
			addedBy: {
				id: userId,
				username,
				avatar,
			},
			addedAt: Date.now(),
		}

		playlist.tracks.push(newTrack)
		await this.db.em.persistAndFlush(playlist)
		return playlist
	}

	/**
	 * Remove a track from a Server Mix playlist.
	 */
	public async removeTrack(
		guildId: string,
		playlistId: string,
		userId: string,
		trackIndex: number
	): Promise<ServerPlaylist> {
		const perms = await this.checkPermissions(guildId, userId)
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		if (trackIndex < 0 || trackIndex >= playlist.tracks.length) {
			throw new Error('Invalid track index.')
		}

		const targetTrack = playlist.tracks[trackIndex]
		const isTrackContributor = targetTrack.addedBy.id === userId
		const isPlaylistCreator = playlist.createdBy.id === userId

		if (!isTrackContributor && !isPlaylistCreator && !perms.canEditPlaylists) {
			throw new Error('You do not have permission to remove this track.')
		}

		playlist.tracks.splice(trackIndex, 1)
		await this.db.em.persistAndFlush(playlist)
		return playlist
	}

	/**
	 * Play all tracks from a Server Mix playlist into the active voice channel.
	 */
	public async playPlaylist(guildId: string, playlistId: string, userId: string): Promise<GuildPlayerState> {
		const playlist = await this.getPlaylist(guildId, playlistId)
		if (!playlist) {
			throw new Error('Playlist not found.')
		}

		if (!playlist.tracks.length) {
			throw new Error('This playlist is empty. Add tracks before playing.')
		}

		const trackList = playlist.tracks.map(t => ({
			url: t.url,
			title: `${t.title} - ${t.author}`,
		}))

		return this.musicService.playTrackList(guildId, userId, trackList)
	}

}
