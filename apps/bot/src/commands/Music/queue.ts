// apps/bot/src/commands/Music/queue.ts
import { Category } from '@discordx/utilities'
import { ApplicationCommandOptionType, CommandInteraction, EmbedBuilder } from 'discord.js'
import { injectable } from 'tsyringe'

import { Discord, Guard, Slash, SlashOption } from '@/decorators'
import { GuildOnly, InVoiceChannel } from '@/guards'
import { MusicService } from '@/services/Music'

@Discord()
@injectable()
@Category('Music')
export default class QueueCommand {

	constructor(
		private readonly musicService: MusicService
	) {}

	@Slash({
		name: 'nowplaying',
		description: 'Display details and playback progress of the currently playing track',
	})
	@Guard(GuildOnly)
	async nowplaying(interaction: CommandInteraction) {
		await interaction.deferReply()

		try {
			const state = this.musicService.getSerializedState(interaction.guildId!)
			const current = state.currentTrack

			if (!current || !state.isPlaying) {
				await interaction.followUp({ content: 'Nothing is currently playing in this server.' })
				return
			}

			const totalMs = current.durationMS || 1
			const currentMs = state.position || 0
			const percent = Math.min(100, Math.max(0, (currentMs / totalMs) * 100))
			const barLength = 15
			const progressIndex = Math.round((percent / 100) * barLength)
			const bar = '▬'.repeat(Math.max(0, progressIndex)) + '🔘' + '▬'.repeat(Math.max(0, barLength - progressIndex))

			const embed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle('🎧 Now Playing')
				.setDescription(`[${current.title}](${current.url})`)
				.addFields(
					{ name: 'Author', value: current.author || 'Unknown', inline: true },
					{ name: 'Requested By', value: current.requestedBy ? `${current.requestedBy.username}` : 'Auto / Bot', inline: true },
					{ name: 'Volume', value: `${state.volume}%`, inline: true },
					{ name: 'Progress', value: `\`${this.formatTime(currentMs)}\` ${bar} \`${current.duration}\``, inline: false }
				)

			if (current.thumbnail)
				embed.setThumbnail(current.thumbnail)

			await interaction.followUp({ embeds: [embed] })
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to retrieve playback details.'
			await interaction.followUp({ content: `❌ ${msg}` })
		}
	}

	@Slash({
		name: 'queue',
		description: 'View upcoming tracks in the music queue',
	})
	@Guard(GuildOnly)
	async queue(
		@SlashOption({
			name: 'page',
			description: 'Queue page number',
			type: ApplicationCommandOptionType.Integer,
			minValue: 1,
			required: false,
		})
		pageInput: number | undefined,
		interaction: CommandInteraction
	) {
		await interaction.deferReply()

		try {
			const state = this.musicService.getSerializedState(interaction.guildId!)
			const queue = state.queue
			const current = state.currentTrack

			if (!current && queue.length === 0) {
				await interaction.followUp({ content: 'The music queue is currently empty.' })
				return
			}

			const pageSize = 10
			const totalPages = Math.ceil(queue.length / pageSize) || 1
			const page = Math.min(totalPages, Math.max(1, pageInput || 1))
			const start = (page - 1) * pageSize
			const tracksForPage = queue.slice(start, start + pageSize)

			const queueListText = tracksForPage.length > 0
				? tracksForPage.map((t, idx) => `**${start + idx + 1}.** [${t.title}](${t.url}) — \`${t.duration}\` (${t.requestedBy ? t.requestedBy.username : 'Unknown'})`).join('\n')
				: '*No more tracks in queue.*'

			const embed = new EmbedBuilder()
				.setColor(0x5865F2)
				.setTitle(`🎶 Server Music Queue (Page ${page}/${totalPages})`)
				.addFields(
					{ name: '▶ Currently Playing', value: current ? `[${current.title}](${current.url}) — \`${current.duration}\`` : 'None' },
					{ name: 'Up Next', value: queueListText }
				)
				.setFooter({ text: `Total queued tracks: ${queue.length}` })

			await interaction.followUp({ embeds: [embed] })
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to view queue.'
			await interaction.followUp({ content: `❌ ${msg}` })
		}
	}

	@Slash({
		name: 'remove',
		description: 'Remove a specific track from the queue by its number',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async remove(
		@SlashOption({
			name: 'position',
			description: 'Position number in /queue (1-based)',
			type: ApplicationCommandOptionType.Integer,
			minValue: 1,
			required: true,
		})
		position: number,
		interaction: CommandInteraction
	) {
		await interaction.deferReply()

		try {
			const trackIndex = position - 1
			const state = await this.musicService.executeAction(interaction.guildId!, {
				action: 'removeTrack',
				trackIndex,
				userId: interaction.user.id,
			})

			await interaction.followUp({ content: `🗑 Removed track #${position} from the queue. Total tracks remaining: ${state.queue.length}.` })
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to remove track.'
			await interaction.followUp({ content: `❌ ${msg}` })
		}
	}

	@Slash({
		name: 'jump',
		description: 'Skip directly to a specific track in the queue by its number',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async jump(
		@SlashOption({
			name: 'position',
			description: 'Position number in /queue (1-based)',
			type: ApplicationCommandOptionType.Integer,
			minValue: 1,
			required: true,
		})
		position: number,
		interaction: CommandInteraction
	) {
		await interaction.deferReply()

		try {
			const trackIndex = position - 1
			const state = await this.musicService.executeAction(interaction.guildId!, {
				action: 'jumpTo',
				trackIndex,
				userId: interaction.user.id,
			})

			await interaction.followUp({ content: `⏭ Jumped to track #${position}: **${state.currentTrack?.title || 'Unknown'}**.` })
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to jump to track.'
			await interaction.followUp({ content: `❌ ${msg}` })
		}
	}

	private formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
	}

}
