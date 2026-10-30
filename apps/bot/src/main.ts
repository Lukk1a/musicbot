import 'reflect-metadata'
import 'dotenv/config'

import process from 'node:process'

import { resolve } from '@discordx/importer'
import { RequestContext } from '@mikro-orm/core'
import chalk from 'chalk'
import chokidar from 'chokidar'
import discordLogs from 'discord-logs'
import { Client as DiscordJSClient } from 'discord.js'
import { Client, DIService, DGuard, MetadataStorage, tsyringeDependencyRegistryEngine } from 'discordx'

// Polyfill @discordx/internal 1.2.0 compatibility
try {
	const discordxPath = require.resolve('discordx')
	const internalPath = require.resolve('@discordx/internal', { paths: [discordxPath] })
	const internal = require(internalPath)
	if (internal.Decorator) {
		const proto = internal.Decorator.prototype
		if (!proto.decorateUnknown) {
			proto.decorateUnknown = proto.attachToTarget
		}
		if (!Object.prototype.hasOwnProperty.call(proto, '_method')) {
			Object.defineProperty(proto, '_method', {
				get() { return this._methodReference ?? this.method },
				set(v) { this._methodReference = v },
				configurable: true,
			})
		}
		if (!Object.prototype.hasOwnProperty.call(proto, '_from')) {
			Object.defineProperty(proto, '_from', {
				get() { return this._sourceClass ?? this.from },
				set(v) { this._sourceClass = v },
				configurable: true,
			})
		}
		if (!Object.prototype.hasOwnProperty.call(proto, '_classRef')) {
			Object.defineProperty(proto, '_classRef', {
				get() { return this._targetClass ?? this.classRef },
				set(v) { this._targetClass = v },
				configurable: true,
			})
		}
		if (!Object.prototype.hasOwnProperty.call(proto, '_key')) {
			Object.defineProperty(proto, '_key', {
				get() { return this._propertyName ?? this.key },
				set(v) { this._propertyName = v },
				configurable: true,
			})
		}
		if (!Object.prototype.hasOwnProperty.call(proto, '_index')) {
			Object.defineProperty(proto, '_index', {
				get() { return this._parameterIndex ?? this.index },
				set(v) { this._parameterIndex = v },
				configurable: true,
			})
		}
	}
	if (internal.Modifier && !internal.Modifier.applyFromModifierListToList) {
		internal.Modifier.applyFromModifierListToList = internal.Modifier.modify
	}
} catch (e) {
	const decoratorProto = Object.getPrototypeOf(DGuard.prototype)
	if (decoratorProto) {
		if (!decoratorProto.decorateUnknown) {
			decoratorProto.decorateUnknown = decoratorProto.attachToTarget
		}
		if (!Object.prototype.hasOwnProperty.call(decoratorProto, '_method')) {
			Object.defineProperty(decoratorProto, '_method', {
				get() { return this._methodReference ?? this.method },
				set(v) { this._methodReference = v },
				configurable: true,
			})
		}
	}
}

import { BaseInteraction } from 'discord.js'
if (BaseInteraction && !(BaseInteraction.prototype as any).isPrimaryEntryPointCommand) {
	(BaseInteraction.prototype as any).isPrimaryEntryPointCommand = function() {
		return false
	}
}

import { container } from 'tsyringe'
import { constructor } from 'tsyringe/dist/typings/types'

import { Server } from '@/api/server'
import { apiConfig, generalConfig } from '@/configs'
import { keptInstances } from '@/decorators'
import { checkEnvironmentVariables, env } from '@/env'
import { NoBotTokenError } from '@/errors'
import { Database, ErrorHandler, EventManager, ImagesUpload, Logger, PluginsManager, Store } from '@/services'
import { initDataTable, resolveDependency } from '@/utils/functions'

import { clientConfig } from './client'

// eslint-disable-next-line node/no-path-concat
const importPattern = `${__dirname}/{events,commands}/**/*.{ts,js}`

/**
 * Import files
 * @param path glob pattern
 */
async function loadFiles(path: string): Promise<void> {
	const files = await resolve(path)
	await Promise.all(
		// eslint-disable-next-line array-callback-return
		files.map((file) => {
			const newFileName = file.replace('file://', '')
			delete require.cache[newFileName]
			return import(newFileName)
		})
	)
}

/**
 * Hot reload
 */
async function reload(client: Client) {
	const store = await resolveDependency(Store)
	store.set('botHasBeenReloaded', true)

	const logger = await resolveDependency(Logger)
	console.log('\n')
	logger.startSpinner('Hot reloading...')

	// remove events
	client.removeEvents()

	// get all instances to keep
	const instancesToKeep: Map<constructor<any>, any> = new Map()
	for (const target of keptInstances) {
		const instance = await resolveDependency(target)
		instancesToKeep.set(target, instance)
	}

	// cleanup
	MetadataStorage.clear()
	DIService.engine.clearAllServices()

	// transfer store instance to the new container in order to keep the same states
	for (const [target, instance] of instancesToKeep) {
		container.registerInstance(target, instance)
	}

	// re-register the client instance
	container.registerInstance(Client, client)
	container.registerInstance(DiscordJSClient, client as unknown as DiscordJSClient)

	// reload files
	await loadFiles(importPattern)

	// rebuild
	await MetadataStorage.instance.build()
	await client.initApplicationCommands()
	client.initEvents()

	// re-init services
	const pluginManager = await resolveDependency(PluginsManager)
	await pluginManager.loadPlugins()

	const db = await resolveDependency(Database)
	await db.initialize()

	logger.log(chalk.whiteBright('Hot reloaded\n'))
}

async function init() {
	const logger = await resolveDependency(Logger)

	// check environment variables
	checkEnvironmentVariables()

	// init error handler
	await resolveDependency(ErrorHandler)

	// init plugins
	const pluginManager = await resolveDependency(PluginsManager)
	await pluginManager.loadPlugins()
	await pluginManager.syncTranslations()

	// start spinner
	console.log('\n')
	logger.startSpinner('Starting...')

	// init the database
	const db = await resolveDependency(Database)
	await db.initialize()

	// init the client
	DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container as any)
	const client = new Client(clientConfig())

	// Load all new events
	discordLogs(client, { debug: false })
	container.registerInstance(Client, client)
	container.registerInstance(DiscordJSClient, client as unknown as DiscordJSClient)

	// import all the commands and events
	await loadFiles(importPattern)
	await pluginManager.importCommands()
	await pluginManager.importEvents()

	// Build discordx metadata storage and link instances
	await MetadataStorage.instance.build()

	RequestContext.create(db.orm.em, async () => {
		const watcher = env.NODE_ENV === 'development' ? chokidar.watch(importPattern) : null

		// init the data table if it doesn't exist
		await initDataTable()

		// init plugins services
		await pluginManager.initServices()

		// init the plugin main file
		await pluginManager.execMains()

		// start the api server
		if (apiConfig.enabled) {
			const server = await resolveDependency(Server)
			await server.start()
		}

		// log in with the bot token
		if (!env.BOT_TOKEN) {
			logger.console('No bot token provided in environment variables (BOT_TOKEN).', 'error')
		} else {
			client.login(env.BOT_TOKEN)
				.then(async () => {
					if (env.NODE_ENV === 'development') {
						// reload commands and events when a file changes
						watcher?.on('change', () => reload(client))

						// reload commands and events when a file is added
						watcher?.on('add', () => reload(client))

						// reload commands and events when a file is deleted
						watcher?.on('unlink', () => reload(client))
					}

					// upload images to imgur if configured
					if (env.IMGUR_CLIENT_ID && generalConfig.automaticUploadImagesToImgur) {
						const imagesUpload = await resolveDependency(ImagesUpload)
						await imagesUpload.syncWithDatabase()
					}

					// Pre-initialize MusicService and audio extractors
					try {
						const { MusicService } = await import('@/services/Music')
						const musicService = await resolveDependency(MusicService)
						await musicService.initialize()
					} catch (musicErr) {
						logger.console(`[MusicService] Initialization warning: ${musicErr}`, 'warn')
					}
				})
				.catch((err) => {
					logger.console(`Discord login error: ${err.message}`, 'error')
				})
		}

		const store = await container.resolve(Store)
		store.select('ready').subscribe(async (ready) => {
			if (
				Object
					.values(ready)
					.filter(value => value !== null)
					.every(value => value === true)
			) {
				const eventManager = await resolveDependency(EventManager)
				eventManager.emit('templateReady')
			}
		})
	})
}

init()
