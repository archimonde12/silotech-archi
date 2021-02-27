import * as Sentry from "@sentry/node";
import { sentryConfig } from './config'

Sentry.init({ dsn: sentryConfig.dns, serverName: `chat-api`, environment: sentryConfig.nodeEnv, tracesSampleRate: 1.0, })

/**
 * The function capture the unexpected error and warning it in sentry
 * @param error error unexpected
 * @param data can be any thing
 */
const CaptureException = (error: any, data: any) => {
    Sentry.addBreadcrumb({ data })
    Sentry.captureException(error)
}

export { Sentry,CaptureException}


