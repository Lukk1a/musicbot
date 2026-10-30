// apps/bot/src/commands/Music/play.ts
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import { injectable } from 'tsyringe'

import { Category, Discord, Guard, Slash, SlashOption } from '@/decorators'
import { GuildOnly, InVoiceChannel } from '@/guards'
import { MusicService } from '@/services/Music'
import { replyErrorContainer, replyMusicContainer } from '@/utils/functions'

@Discord()
@injectable()
@Category('Music')
export default class PlayCommand {

	constructor(
		private readonly musicService: MusicService
	) {}

	@Slash({
		name: 'play',
		description: 'Play a track or playlist from YouTube, Spotify, SoundCloud, or URL',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async play(
		@SlashOption({
			name: 'query',
			description: 'Song name, keywords, or streaming link',
			type: ApplicationCommandOptionType.String,
			required: true,
		})
		query: string,
		interaction: CommandInteraction
	) {
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply()
		}

		try {
			const guildId = interaction.guildId!
			const userId = interaction.user.id

			const state = await this.musicService.executeAction(guildId, {
				action: 'play',
				query,
				userId,
			})

			const current = state.currentTrack
			const isQueueAdd = state.queue.length > 0 && current?.title !== query
			const header = isQueueAdd ? '### 🎵 Added to Queue' : '### ▶ Now Playing'
			const trackTitle = current?.title || query
			const trackLink = current?.url ? `[**${trackTitle}**](${current.url})` : `**${trackTitle}**`

			const text = `${header}\n${trackLink}\n\n**Author:** ${current?.author || 'Unknown'} • **Duration:** \`${current?.duration || 'Unknown'}\` • **Queue:** \`${state.queue.length} track(s)\`\n-# Requested by <@${userId}>`

			await replyMusicContainer(interaction, text)
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to play track.'
			await replyErrorContainer(interaction, 'Playback Error', message)
		}
	}

}
