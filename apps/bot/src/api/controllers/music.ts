// apps/bot/src/api/controllers/music.ts
import { Context, Controller, Delete, Get, PathParams, PlatformContext, Post, QueryParams, UseBefore } from '@tsed/common'
import { BadRequest, Forbidden, NotFound } from '@tsed/exceptions'
import { Client } from 'discordx'

import { Authenticated, BotOnline } from '@/api/middlewares'
import { MusicService } from '@/services/Music'
import { PlaylistService } from '@/services/Playlist'
import { BaseController } from '@/utils/classes'
import { resolveDependencies, resolveDependency } from '@/utils/functions'
import type {
	GuildMusicConfigData,
	GuildPlayerState,
	MutualGuildStatus,
	PlayerControlAction,
	ServerPlaylist,
	ServerPlaylistTrack,
} from '@musicbot/shared'

@Controller('/music')
@UseBefore(
	BotOnline,
	Authenticated
)
export class MusicController extends BaseController {

	private client: Client
	private musicService: MusicService
	private playlistService: PlaylistService

	constructor() {
		super()
		resolveDependencies([Client, MusicService, PlaylistService]).then(([client, musicService, playlistService]) => {
			this.client = client
			this.musicService = musicService
			this.playlistService = playlistService
		})
	}

	private async getMusicService(): Promise<MusicService> {
		if (!this.musicService) {
			const { MusicService } = await import('@/services/Music')
			this.musicService = await resolveDependency(MusicService)
		}
		return this.musicService
	}

	private async getPlaylistService(): Promise<PlaylistService> {
		if (!this.playlistService) {
			const { PlaylistService } = await import('@/services/Playlist')
			this.playlistService = await resolveDependency(PlaylistService)
		}
		return this.playlistService
	}

	private async getClient(): Promise<Client> {
		if (!this.client) {
			this.client = await resolveDependency(Client)
		}
		return this.client
	}

	@Get('/:guildId/state')
	async getState(
		@PathParams('guildId') guildId: string
	): Promise<GuildPlayerState> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const musicService = await this.getMusicService()
		return musicService.getSerializedState(guildId)
	}

	@Post('/:guildId/control')
	async control(
		@PathParams('guildId') guildId: string,
		@Context() ctx: PlatformContext
	): Promise<GuildPlayerState> {
		const actionPayload = ctx.request.body as PlayerControlAction
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		if (!actionPayload || !actionPayload.action || !actionPayload.userId)
			throw new BadRequest('Invalid control action payload: action and userId are required.')

		const musicService = await this.getMusicService()
		const auth = await musicService.verifyMemberVoice(guildId, actionPayload.userId)
		if (!auth.authorized) {
			throw new Forbidden(auth.error || 'Voice channel security check failed.')
		}

		try {
			return await musicService.executeAction(guildId, actionPayload)
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Action execution failed.'
			throw new BadRequest(message)
		}
	}

	@Get('/guilds/mutual')
	async getMutualGuilds(
		@QueryParams('guildIds') guildIdsQuery?: string
	): Promise<MutualGuildStatus[]> {
		const client = await this.getClient()
		const musicService = await this.getMusicService()
		if (!client || !client.user)
			return []

		const userGuildIds = (guildIdsQuery || '')
			.split(',')
			.map(id => id.trim())
			.filter(id => id.length > 0)

		const mutualList: MutualGuildStatus[] = []

		for (const gId of userGuildIds) {
			const botGuild = client.guilds.cache.get(gId)
			if (botGuild) {
				const state = musicService.getSerializedState(gId)
				mutualList.push({
					id: botGuild.id,
					name: botGuild.name,
					icon: botGuild.iconURL(),
					botPresent: true,
					hasManageGuild: false,
					isPlaying: state.isPlaying,
					currentTrack: state.currentTrack,
					memberCount: botGuild.memberCount,
				})
			}
		}

		return mutualList
	}

	@Get('/:guildId/config')
	async getConfig(
		@PathParams('guildId') guildId: string
	): Promise<GuildMusicConfigData> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const playlistService = await this.getPlaylistService()
		return playlistService.getGuildConfig(guildId)
	}

	@Post('/:guildId/config')
	async updateConfig(
		@PathParams('guildId') guildId: string,
		@Context() ctx: PlatformContext
	): Promise<GuildMusicConfigData> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const body = ctx.request.body as { userId?: string; updates?: Partial<GuildMusicConfigData> }
		if (!body || !body.userId || !body.updates)
			throw new BadRequest('Missing required parameters: userId and updates.')

		const playlistService = await this.getPlaylistService()
		try {
			return await playlistService.updateGuildConfig(guildId, body.userId, body.updates)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to update config.'
			throw new Forbidden(msg)
		}
	}

	@Get('/:guildId/playlists')
	async getPlaylists(
		@PathParams('guildId') guildId: string
	): Promise<ServerPlaylist[]> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const playlistService = await this.getPlaylistService()
		return playlistService.getPlaylists(guildId)
	}

	@Post('/:guildId/playlists')
	async createPlaylist(
		@PathParams('guildId') guildId: string,
		@Context() ctx: PlatformContext
	): Promise<ServerPlaylist> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const body = ctx.request.body as {
			userId?: string
			username?: string
			avatar?: string
			name?: string
			description?: string
		}

		if (!body || !body.userId || !body.username || !body.name)
			throw new BadRequest('Missing required parameters: userId, username, and name are required.')

		const playlistService = await this.getPlaylistService()
		try {
			return await playlistService.createPlaylist(
				guildId,
				body.userId,
				body.username,
				body.avatar,
				body.name,
				body.description
			)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to create playlist.'
			throw new BadRequest(msg)
		}
	}

	@Get('/:guildId/playlists/:playlistId')
	async getPlaylistById(
		@PathParams('guildId') guildId: string,
		@PathParams('playlistId') playlistId: string
	): Promise<ServerPlaylist> {
		if (!guildId || !playlistId)
			throw new BadRequest('Guild ID and Playlist ID are required.')

		const playlistService = await this.getPlaylistService()
		const playlist = await playlistService.getPlaylist(guildId, playlistId)
		if (!playlist)
			throw new NotFound('Playlist not found.')

		return playlist
	}

	@Delete('/:guildId/playlists/:playlistId')
	async deletePlaylistById(
		@PathParams('guildId') guildId: string,
		@PathParams('playlistId') playlistId: string,
		@Context() ctx: PlatformContext
	): Promise<{ success: boolean }> {
		if (!guildId || !playlistId)
			throw new BadRequest('Guild ID and Playlist ID are required.')

		const body = ctx.request.body as { userId?: string }
		if (!body || !body.userId)
			throw new BadRequest('User ID is required.')

		const playlistService = await this.getPlaylistService()
		try {
			const success = await playlistService.deletePlaylist(guildId, playlistId, body.userId)
			return { success }
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to delete playlist.'
			throw new Forbidden(msg)
		}
	}

	@Post('/:guildId/playlists/:playlistId/tracks')
	async addTrackToPlaylist(
		@PathParams('guildId') guildId: string,
		@PathParams('playlistId') playlistId: string,
		@Context() ctx: PlatformContext
	): Promise<ServerPlaylist> {
		if (!guildId || !playlistId)
			throw new BadRequest('Guild ID and Playlist ID are required.')

		const body = ctx.request.body as {
			userId?: string
			username?: string
			avatar?: string
			track?: Omit<ServerPlaylistTrack, 'id' | 'addedBy' | 'addedAt'>
		}

		if (!body || !body.userId || !body.username || !body.track)
			throw new BadRequest('Missing required parameters: userId, username, and track are required.')

		const playlistService = await this.getPlaylistService()
		try {
			return await playlistService.addTrack(
				guildId,
				playlistId,
				body.userId,
				body.username,
				body.avatar,
				body.track
			)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to add track.'
			throw new Forbidden(msg)
		}
	}

	@Delete('/:guildId/playlists/:playlistId/tracks/:trackIndex')
	async removeTrackFromPlaylist(
		@PathParams('guildId') guildId: string,
		@PathParams('playlistId') playlistId: string,
		@PathParams('trackIndex') trackIndexStr: string,
		@Context() ctx: PlatformContext
	): Promise<ServerPlaylist> {
		if (!guildId || !playlistId)
			throw new BadRequest('Guild ID and Playlist ID are required.')

		const trackIndex = parseInt(trackIndexStr, 10)
		if (isNaN(trackIndex))
			throw new BadRequest('Track index must be a number.')

		const body = ctx.request.body as { userId?: string }
		if (!body || !body.userId)
			throw new BadRequest('User ID is required.')

		const playlistService = await this.getPlaylistService()
		try {
			return await playlistService.removeTrack(guildId, playlistId, body.userId, trackIndex)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to remove track.'
			throw new Forbidden(msg)
		}
	}

	@Post('/:guildId/playlists/:playlistId/play')
	async playPlaylist(
		@PathParams('guildId') guildId: string,
		@PathParams('playlistId') playlistId: string,
		@Context() ctx: PlatformContext
	): Promise<GuildPlayerState> {
		if (!guildId || !playlistId)
			throw new BadRequest('Guild ID and Playlist ID are required.')

		const body = ctx.request.body as { userId?: string }
		if (!body || !body.userId)
			throw new BadRequest('User ID is required.')

		const playlistService = await this.getPlaylistService()
		try {
			return await playlistService.playPlaylist(guildId, playlistId, body.userId)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to play playlist.'
			throw new BadRequest(msg)
		}
	}

	@Post('/:guildId/batch-play')
	async batchPlay(
		@PathParams('guildId') guildId: string,
		@Context() ctx: PlatformContext
	): Promise<GuildPlayerState> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		const body = ctx.request.body as {
			userId?: string
			tracks?: Array<{ url: string; title: string }>
		}

		if (!body || !body.userId || !body.tracks || !body.tracks.length)
			throw new BadRequest('Missing required parameters: userId and a non-empty tracks array are required.')

		const musicService = await this.getMusicService()
		try {
			return await musicService.playTrackList(guildId, body.userId, body.tracks)
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to play tracks.'
			throw new BadRequest(msg)
		}
	}

}
