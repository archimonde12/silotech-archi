import { connect, Db, MongoClient } from "mongodb"
import { mongoUri } from "./config"
import { MessageIndexes } from "./models/Message";
import { ChatRoomIndexes } from "./models/chatRoom";
import { FriendRequestIndexes } from "./models/FriendRequest";

let client: MongoClient
let db: Db

const collectionNames = {
    friendRequests:'friendRequests',
    messages:'messages',
    chatRooms:'chatRooms',
    users:'users'
}

const connectMongoDb = async () => {
    try {
        client = await connect(mongoUri, {
            useUnifiedTopology: true,
            useNewUrlParser: true,
            ignoreUndefined: true
        })

        client.on('error', async (e) => {
            try {
                await client.close()
                await connectMongoDb()
            } catch (e) {
                setTimeout(connectMongoDb, 1000)
                throw e
            }
        })

        client.on('timeout', async () => {
            try {
                await client.close()
                await connectMongoDb()
            } catch (e) {
                setTimeout(connectMongoDb, 1000)
                throw e
            }
        })

        client.on('close', async () => {
            try {
                await connectMongoDb()
            } catch (e) {
                throw e
            }
        })

        db = client.db()
        await Promise.all([
            db.collection(collectionNames.friendRequests).createIndexes(FriendRequestIndexes),
            db.collection(collectionNames.messages).createIndexes(MessageIndexes),
            db.collection(collectionNames.chatRooms).createIndexes(ChatRoomIndexes)
        ])
        console.log(`Mongodb: connected`)
    } catch (err) { 
        console.error(`Mongodb: disconnected`)
        await client?.close(true)
        setTimeout(connectMongoDb, 1000)
        throw err
    }
}

export {
    client,
    db,
    connectMongoDb,
    collectionNames
}