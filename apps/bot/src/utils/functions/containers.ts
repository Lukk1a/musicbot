// apps/bot/src/utils/functions/containers.ts
import {
	CommandInteraction,
	ContainerBuilder,
	InteractionReplyOptions,
} from 'discord.js'

export const IS_COMPONENTS_V2 = 1 << 15

export interface MessageContainerOptions {
	accentColor?: number
	content: string
}

/**
 * Creates a Discord Components V2 Container component.
 */
export function createMessageContainer(options: MessageContainerOptions): ContainerBuilder {
	const container = new ContainerBuilder()
	if (options.accentColor !== undefined) {
		container.setAccentColor(options.accentColor)
	}
	container.addTextDisplayComponents((t) => t.setContent(options.content))
	return container
}

/**
 * Send a Components V2 container to a command interaction safely.
 */
export async function replyWithContainer(
	interaction: CommandInteraction,
	container: ContainerBuilder
): Promise<void> {
	const payload = {
		components: [container],
		flags: [IS_COMPONENTS_V2],
	} as unknown as InteractionReplyOptions

	await interaction.followUp(payload)
}

/**
 * Send a music status container to an interaction.
 */
export async function replyMusicContainer(
	interaction: CommandInteraction,
	content: string,
	accentColor = 0x5865F2
): Promise<void> {
	const container = createMessageContainer({ content, accentColor })
	await replyWithContainer(interaction, container)
}

/**
 * Send a success container to an interaction.
 */
export async function replySuccessContainer(
	interaction: CommandInteraction,
	title: string,
	description?: string
): Promise<void> {
	const content = description ? `### ✅ ${title}\n${description}` : `### ✅ ${title}`
	const container = createMessageContainer({ content, accentColor: 0x57F287 })
	await replyWithContainer(interaction, container)
}

/**
 * Send an error container to an interaction.
 */
export async function replyErrorContainer(
	interaction: CommandInteraction,
	title: string,
	description?: string
): Promise<void> {
	const content = description ? `### ❌ ${title}\n${description}` : `### ❌ ${title}`
	const container = createMessageContainer({ content, accentColor: 0xED4245 })
	await replyWithContainer(interaction, container)
}
