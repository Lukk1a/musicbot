// apps/bot/src/guards/InVoiceChannel.ts
import { CommandInteraction, GuildMember } from 'discord.js'
import { GuardFunction, SimpleCommandMessage } from 'discordx'

import { MusicService } from '@/services/Music'
import { resolveDependency } from '@/utils/functions'

export const InVoiceChannel: GuardFunction<
	| CommandInteraction
	| SimpleCommandMessage
> = async (arg, _client, next) => {
	const interaction = arg instanceof CommandInteraction ? arg : null
	const message = arg instanceof SimpleCommandMessage ? arg.message : null

	const guildId = interaction?.guildId ?? message?.guild?.id
	const member = (interaction?.member ?? message?.member) as GuildMember | null

	if (!guildId || !member) {
		const msg = 'This command can only be used inside a Discord server.'
		if (interaction) {
			if (interaction.deferred || interaction.replied)
				await interaction.followUp({ content: msg, ephemeral: true })
			else
				await interaction.reply({ content: msg, ephemeral: true })
		}
		return
	}

	const musicService = await resolveDependency(MusicService)
	const verification = await musicService.verifyMemberVoice(guildId, member.id)

	if (!verification.authorized) {
		const errorMsg = verification.error || 'You must be in a voice channel (and in the same channel as the bot) to use music commands.'
		if (interaction) {
			if (interaction.deferred || interaction.replied)
				await interaction.followUp({ content: errorMsg, ephemeral: true })
			else
				await interaction.reply({ content: errorMsg, ephemeral: true })
		}
		else if (message) {
			await message.reply(errorMsg)
		}
		return
	}

	return next()
}
