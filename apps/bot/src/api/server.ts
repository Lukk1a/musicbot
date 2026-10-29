// apps/bot/src/api/server.ts
import '@tsed/swagger'

import Http, { type Server as HttpServer } from 'node:http'
import { CreateRequestContext, MikroORM } from '@mikro-orm/core'
import { Configuration } from '@tsed/di'
import { Inject, PlatformAcceptMimesMiddleware, PlatformApplication } from '@tsed/common'
import { PlatformExpress } from '@tsed/platform-express'
import bodyParser from 'body-parser'

import * as controllers from '@/api/controllers'
import { Log } from '@/api/middlewares'
import { Service } from '@/decorators'
import { env } from '@/env'
import { Database, PluginsManager, SocketService, Store } from '@/services'
import { resolveDependency } from '@/utils/functions'

@Configuration({})
@Service()
export class Server {

	@Inject() app: PlatformApplication

	orm: MikroORM

	constructor(
		private pluginsManager: PluginsManager,
		private store: Store,
		db: Database
	) {
		this.orm = db.orm
	}

	$beforeRoutesInit() {
		this.app
			.use(bodyParser.json())
			.use(bodyParser.urlencoded({ extended: true }))
			.use((req: any, _res: any, next: any) => {
				console.log('[Server Middleware] Content-Type:', req.headers['content-type'], 'Body:', req.body)
				next()
			})
			.use(Log)
			.use(PlatformAcceptMimesMiddleware)

		return null
	}

	@CreateRequestContext()
	async start(): Promise<void> {
		const platform = await PlatformExpress.bootstrap(Server, {
			rootDir: __dirname,
			httpPort: env.API_PORT,
			httpsPort: false,
			acceptMimes: ['application/json'],
			mount: {
				'/': [...Object.values(controllers), ...this.pluginsManager.getControllers()],
			},
			swagger: [
				{
					path: '/docs',
					specVersion: '3.0.1',
				},
			],
			logger: {
				level: 'warn',
				disableRoutesSummary: true,
			},
		})

		platform.listen().then(async () => {
			const rawHttpServer = platform.injector.get<HttpServer>(Http.Server) ?? (platform as unknown as { httpServer?: HttpServer }).httpServer
			if (rawHttpServer) {
				const socketService = await resolveDependency(SocketService)
				socketService.init(rawHttpServer)
			} else {
				console.warn('[Server] Could not obtain raw HTTP server from Ts.ED platform.')
			}
			this.store.update('ready', e => ({ ...e, api: true }))
		})
	}

}
