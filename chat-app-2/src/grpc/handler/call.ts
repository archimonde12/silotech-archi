import {server_publish_news} from './server_publish_news'

const methods = {
    server_publish_news:"server_publish_news",
}

type CallReturn = {
    result:string|null
    error:string|null    
}

const call = async ({ request, metadata }, callback) => {
    try {
        switch (request.method) {
            case methods.server_publish_news: return callback(null, await server_publish_news({ request }))
            default:
                return callback({ code: 9999 })
        }
    } catch (e) {
        callback(e)
    }
}

export {call,CallReturn}