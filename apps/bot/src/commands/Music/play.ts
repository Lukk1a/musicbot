// apps/bot/src/commands/Music/play.ts
import { Category } from '@/decorators'
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from 'discord.js'
import { injectable } from 'tsyringe'

import { Discord, Guard, Slash, SlashOption } from '@/decorators'
import { GuildOnly, InVoiceChannel } from '@/guards'
import { MusicService } from '@/services/Music'

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
		await interaction.deferReply()

		try {
			const guildId = interaction.guildId!
			const userId = interaction.user.id

			const state = await this.musicService.executeAction(guildId, {
				action: 'play',
				query,
				userId,
			})

			const current = state.currentTrack
			const embed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle(state.queue.length > 0 && current?.title !== query ? 'ðŸŽ¶ Added to Queue' : 'â–¶ Now Playing')
				.setDescription(`[${current?.title || query}](${current?.url || ''})`)
				.addFields(
					{ name: 'Author', value: current?.author || 'Unknown', inline: true },
					{ name: 'Duration', value: current?.duration || 'Unknown', inline: true },
					{ name: 'Queue Size', value: `${state.queue.length} track(s)`, inline: true }
				)

			if (current?.thumbnail)
				embed.setThumbnail(current.thumbnail)

			await interaction.followUp({ embeds: [embed] })
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to play track.'
			await interaction.followUp({ content: `âŒ ${message}` })
		}
	}

}
