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
	 * List all Server Mix playlists for a guild.
	 */
	public async getPlaylists(guildId: string): Promise<ServerPlaylist[]> {
		return this.db.get(ServerPlaylist).find({ guildId }, {
			orderBy: { updatedAt: 'DESC' },
		})
	}

	/**
	 * Get a specific playlist by ID.
	 */
	public async getPlaylist(guildId: string, playlistId: string): Promise<ServerPlaylist | null> {
		return this.db.get(ServerPlaylist).findOne({ guildId, id: playlistId })
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
	 * Add a track to a Server Mix playlist.
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

		const newTrack: ServerPlaylistTrack = {
			id: uuidv4(),
			title: track.title,
			author: track.author,
			duration: track.duration,
			durationMS: track.durationMS,
			thumbnail: track.thumbnail,
			url: track.url,
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
