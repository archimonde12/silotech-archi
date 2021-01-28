import * as Sentry from "@sentry/node";
import { sentryConfig } from './config'

Sentry.init({ dsn: sentryConfig.dns, serverName: `chat-api`, environment: sentryConfig.nodeEnv, tracesSampleRate: 1.0, })

/**
 * The function capture the error and warning in sentry
 * @param error error unexpected
 * @param data can be any thing
 */
const captureExeption = (error: any, data: any) => {
    Sentry.addBreadcrumb({ data })
    Sentry.captureException(error)
}

export { Sentry,captureExeption}


