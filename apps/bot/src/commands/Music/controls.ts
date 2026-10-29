// apps/bot/src/commands/Music/controls.ts
import { Category } from '@/decorators'
import { ApplicationCommandOptionType, CommandInteraction } from 'discord.js'
import { injectable } from 'tsyringe'

import { Discord, Guard, Slash, SlashChoice, SlashOption } from '@/decorators'
import { GuildOnly, InVoiceChannel } from '@/guards'
import { MusicService } from '@/services/Music'

@Discord()
@injectable()
@Category('Music')
export default class ControlsCommand {

	constructor(
		private readonly musicService: MusicService
	) {}

	@Slash({
		name: 'pause',
		description: 'Pause the current audio playback',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async pause(interaction: CommandInteraction) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'pause',
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: 'â¸ Playback paused.' })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to pause playback.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'resume',
		description: 'Resume paused audio playback',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async resume(interaction: CommandInteraction) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'resume',
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: 'â–¶ Playback resumed.' })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to resume playback.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'skip',
		description: 'Skip the current track',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async skip(interaction: CommandInteraction) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'skip',
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: 'â­ Skipped track.' })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to skip track.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'stop',
		description: 'Stop playback, clear the queue, and leave voice',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async stop(interaction: CommandInteraction) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'stop',
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: 'â¹ Playback stopped and queue cleared.' })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to stop playback.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'shuffle',
		description: 'Shuffle all songs in the queue',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async shuffle(interaction: CommandInteraction) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'shuffle',
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: 'ðŸ”€ Queue shuffled.' })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to shuffle queue.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'volume',
		description: 'Adjust playback volume (0 - 100%)',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async volume(
		@SlashOption({
			name: 'level',
			description: 'Volume level from 0 to 100',
			type: ApplicationCommandOptionType.Integer,
			minValue: 0,
			maxValue: 100,
			required: true,
		})
		level: number,
		interaction: CommandInteraction
	) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'volume',
				value: level,
				userId: interaction.user.id,
			})
			await interaction.followUp({ content: `ðŸ”Š Volume set to **${level}%**.` })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to set volume.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

	@Slash({
		name: 'loop',
		description: 'Set repeat mode for the track or queue',
	})
	@Guard(GuildOnly, InVoiceChannel)
	async loop(
		@SlashChoice(
			{ name: 'Off', value: 0 },
			{ name: 'Track', value: 1 },
			{ name: 'Queue', value: 2 },
			{ name: 'Autoplay', value: 3 }
		)
		@SlashOption({
			name: 'mode',
			description: 'Repeat mode selection',
			type: ApplicationCommandOptionType.Integer,
			required: true,
		})
		mode: number,
		interaction: CommandInteraction
	) {
		await interaction.deferReply()
		try {
			await this.musicService.executeAction(interaction.guildId!, {
				action: 'loop',
				mode: mode as 0 | 1 | 2 | 3,
				userId: interaction.user.id,
			})

			const labels = ['Disabled (Off)', 'Current Track', 'Entire Queue', 'Autoplay']
			await interaction.followUp({ content: `ðŸ” Loop mode set to **${labels[mode]}**.` })
		}
		catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to update loop mode.'
			await interaction.followUp({ content: `âŒ ${msg}` })
		}
	}

}
