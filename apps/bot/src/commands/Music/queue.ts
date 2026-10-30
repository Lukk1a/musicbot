// apps/bot/src/commands/Music/queue.ts
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import { injectable } from 'tsyringe'

import { Category, Discord, Guard, Slash, SlashOption } from '@/decorators'
import { GuildOnly, InVoiceChannel } from '@/guards'
import { MusicService } from '@/services/Music'
import { replyErrorContainer, replyMusicContainer, replySuccessContainer } from '@/utils/functions'

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
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply()
		}

		try {
			const state = this.musicService.getSerializedState(interaction.guildId!)
			const current = state.currentTrack

			if (!current || !state.isPlaying) {
				await replyMusicContainer(interaction, '### ℹ️ Nothing Playing\nNo audio is currently playing in this server.', 0x747F8D)
				return
			}

			const totalMs = current.durationMS || 1
			const currentMs = state.position || 0
			const percent = Math.min(100, Math.max(0, (currentMs / totalMs) * 100))
			const barLength = 15
			const progressIndex = Math.round((percent / 100) * barLength)
			const bar = '▬'.repeat(Math.max(0, progressIndex)) + '🔘' + '▬'.repeat(Math.max(0, barLength - progressIndex))

			const requester = current.requestedBy ? current.requestedBy.username : 'Auto / Bot'
			const content = `### 🎧 Now Playing\n[**${current.title}**](${current.url})\n\n**Author:** ${current.author || 'Unknown'}\n**Requested By:** ${requester}\n**Volume:** \`${state.volume}%\`\n**Progress:** \`${this.formatTime(currentMs)}\` ${bar} \`${current.duration}\``

			await replyMusicContainer(interaction, content)
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to retrieve playback details.'
			await replyErrorContainer(interaction, 'Action Failed', msg)
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
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply()
		}

		try {
			const state = this.musicService.getSerializedState(interaction.guildId!)
			const queue = state.queue
			const current = state.currentTrack

			if (!current && queue.length === 0) {
				await replyMusicContainer(interaction, '### ℹ️ Empty Queue\nThe music queue is currently empty.', 0x747F8D)
				return
			}

			const pageSize = 10
			const totalPages = Math.ceil(queue.length / pageSize) || 1
			const page = Math.min(totalPages, Math.max(1, pageInput || 1))
			const start = (page - 1) * pageSize
			const tracksForPage = queue.slice(start, start + pageSize)

			const currentText = current
				? `**▶ Currently Playing:** [**${current.title}**](${current.url}) — \`${current.duration}\``
				: '*No active track.*'

			const queueListText = tracksForPage.length > 0
				? tracksForPage.map((t, idx) => `\`${start + idx + 1}.\` [${t.title}](${t.url}) — \`${t.duration}\` (${t.requestedBy ? t.requestedBy.username : 'Unknown'})`).join('\n')
				: '*No more tracks in queue.*'

			const content = `### 🎵 Server Music Queue (Page ${page}/${totalPages})\n${currentText}\n\n**Up Next:**\n${queueListText}\n\n-# Total queued tracks: ${queue.length}`

			await replyMusicContainer(interaction, content)
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to view queue.'
			await replyErrorContainer(interaction, 'Action Failed', msg)
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
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply()
		}

		try {
			const trackIndex = position - 1
			const state = await this.musicService.executeAction(interaction.guildId!, {
				action: 'removeTrack',
				trackIndex,
				userId: interaction.user.id,
			})

			await replySuccessContainer(interaction, 'Track Removed', `Removed track #${position} from the queue. Total tracks remaining: \`${state.queue.length}\`.`)
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to remove track.'
			await replyErrorContainer(interaction, 'Action Failed', msg)
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
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply()
		}

		try {
			const trackIndex = position - 1
			const state = await this.musicService.executeAction(interaction.guildId!, {
				action: 'jumpTo',
				trackIndex,
				userId: interaction.user.id,
			})

			await replyMusicContainer(interaction, `### ⏭ Jumped to Track\nJumped to track #${position}: **${state.currentTrack?.title || 'Unknown'}**.\n-# Requested by <@${interaction.user.id}>`)
		}
		catch (error) {
			const msg = error instanceof Error ? error.message : 'Failed to jump to track.'
			await replyErrorContainer(interaction, 'Action Failed', msg)
		}
	}

	private formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
	}

}
