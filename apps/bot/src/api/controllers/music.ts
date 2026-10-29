// apps/bot/src/api/controllers/music.ts
import { BodyParams, Controller, Get, PathParams, Post, QueryParams, Req, UseBefore } from '@tsed/common'
import { BadRequest, Forbidden, NotFound } from '@tsed/exceptions'
import { Client } from 'discordx'

import { Authenticated, BotOnline } from '@/api/middlewares'
import { MusicService } from '@/services/Music'
import { BaseController } from '@/utils/classes'
import { resolveDependencies, resolveDependency } from '@/utils/functions'
import type { GuildPlayerState, MutualGuildStatus, PlayerControlAction } from '@musicbot/shared'

@Controller('/music')
@UseBefore(
	BotOnline,
	Authenticated
)
export class MusicController extends BaseController {

	private client: Client
	private musicService: MusicService

	constructor() {
		super()
		resolveDependencies([Client, MusicService]).then(([client, musicService]) => {
			this.client = client
			this.musicService = musicService
		})
	}

	private async getMusicService(): Promise<MusicService> {
		if (!this.musicService) {
			const { MusicService } = await import('@/services/Music')
			this.musicService = await resolveDependency(MusicService)
		}
		return this.musicService
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
		@BodyParams() body: any,
		@Req() req: any
	): Promise<GuildPlayerState> {
		const actionPayload = (req?.body && Object.keys(req.body).length > 0) ? req.body : body
		console.log('[MusicController] POST control received, guildId:', guildId, 'payload:', actionPayload)
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		if (!actionPayload || !actionPayload.action || !actionPayload.userId)
			throw new BadRequest('Invalid control action payload: action and userId are required.')

		const musicService = await this.getMusicService()
		const auth = await musicService.verifyMemberVoice(guildId, actionPayload.userId)
		if (!auth.authorized) {
			console.warn(`[MusicController] Voice check failed for user ${actionPayload.userId} in guild ${guildId}: ${auth.error}`)
			throw new Forbidden(auth.error || 'Voice channel security check failed.')
		}

		try {
			return await musicService.executeAction(guildId, actionPayload)
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Action execution failed.'
			console.error(`[MusicController] executeAction error for guild ${guildId}:`, error)
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

}
