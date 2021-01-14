import { load } from "@grpc/proto-loader"
import { Server, ServerCredentials } from "grpc"
import { join } from "path"
import {call} from "./handler/call"

const initGrpcServer = async () => {
    try {
        const opts = {
            keepCase: true,
            longs: String,
            enums: String,
            arrays: true,
            objects: true
        }

        const host = `0.0.0.0:6565`

        const { ChatService } = await load(join(__dirname, "/proto/chat-service.proto"), opts) as any

        const grpc = new Server()

        grpc.addService(ChatService, { call })

        grpc.bind(host, ServerCredentials.createInsecure())

        grpc.start()

        console.log(`🚀 Grpc server running at ${host}`)
    } catch (e) {
        throw e
    }
}

export {initGrpcServer}