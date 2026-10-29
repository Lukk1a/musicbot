// apps/bot/src/api/controllers/music.ts
import { BodyParams, Controller, Get, PathParams, Post, QueryParams, UseBefore } from '@tsed/common'
import { BadRequest, Forbidden, NotFound } from '@tsed/exceptions'
import { Client } from 'discordx'

import { Authenticated, BotOnline } from '@/api/middlewares'
import { MusicService } from '@/services/Music'
import { BaseController } from '@/utils/classes'
import { resolveDependencies } from '@/utils/functions'
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

	@Get('/:guildId/state')
	async getState(
		@PathParams('guildId') guildId: string
	): Promise<GuildPlayerState> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		return this.musicService.getSerializedState(guildId)
	}

	@Post('/:guildId/control')
	async control(
		@PathParams('guildId') guildId: string,
		@BodyParams() body: PlayerControlAction
	): Promise<GuildPlayerState> {
		if (!guildId)
			throw new BadRequest('Guild ID is required.')

		if (!body || !body.action || !body.userId)
			throw new BadRequest('Invalid control action payload: action and userId are required.')

		const auth = await this.musicService.verifyMemberVoice(guildId, body.userId)
		if (!auth.authorized)
			throw new Forbidden(auth.error || 'Voice channel security check failed.')

		try {
			return await this.musicService.executeAction(guildId, body)
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
		if (!this.client || !this.client.user)
			return []

		const userGuildIds = (guildIdsQuery || '')
			.split(',')
			.map(id => id.trim())
			.filter(id => id.length > 0)

		const mutualList: MutualGuildStatus[] = []

		for (const gId of userGuildIds) {
			const botGuild = this.client.guilds.cache.get(gId)
			if (botGuild) {
				const state = this.musicService.getSerializedState(gId)
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
