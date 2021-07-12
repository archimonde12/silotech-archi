import { getClientIp } from "@supercharge/request-ip/dist";
import { NEWS_ROOM } from "../../../config";
import { increaseTicketNo, ticketNo } from "../../../models/Log";
import { Message, MessageInMongo, MessageTypes } from "../../../models/Message";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { getAsync } from "../../../redis";
import { CaptureException } from "../../../sentry";
import { ErrorResolve, saveErrorLog, saveRequestLog, saveSuccessLog } from "../../../utils";
import { LISTEN_CHANEL, LIST_INBOX_CHANEL, pubsub } from "../subscriptions";

let newest_news_room_message: MessageInMongo | null = null
const setNewestNewsRoomMessage = (_message: MessageInMongo) => {
    newest_news_room_message = _message
}

const getNewestNewsRoomMessage = async () => {
    try {
        if (!newest_news_room_message) {
            const key = 'chat-api.news_room.last_message'
            const getFromRedis = await getAsync(key)
            if (!getFromRedis) {
                return null
            }
            return JSON.parse(getFromRedis)
        }
        return newest_news_room_message
    } catch (e) { throw e }
}

export const chat_api_system_publish_news = async (root: any,
    args: any,
    ctx: any
): Promise<any> => {
    const clientIp = getClientIp(ctx.req)
    const ticket = `${new Date().getTime()}.${ticketNo}.${clientIp ? clientIp : "unknown"}`
    increaseTicketNo()
    //Start transaction
    const session = client.startSession();
    try {
        //Create request log
        saveRequestLog(ticket, args, chat_api_system_publish_news.name, clientIp)
        //Get arguments
        const { data } = args
        let finalResult: ResultMessage = {
            message: '',
            data: null
        }
        await session.withTransaction(async () => {
            //Prepare new message
            const now = new Date()
            const newMessage: Message = {
                createdBy: {
                    slug: 'admin'
                },
                data,
                roomId: NEWS_ROOM,
                sentAt: now,
                type: MessageTypes.system.name
            }
            //Insert new message to messages collection relate to system publish
            const insertRes = await db.collection(collectionNames.messages).insertOne(newMessage, { session })
            console.log(`${insertRes.insertedCount} doc(s) was/were inserted to messages collection`)
            if (insertRes.insertedCount === 0) {
                session.abortTransaction()
                finalResult.message = `inserted fail`
                return
            }
            setNewestNewsRoomMessage({ ...newMessage, _id: insertRes.insertedId })
            //Update news room 
            const updateDoc = {
                $set: {
                    updatedAt: now,
                    lastMess: newMessage
                }
            }
            const updateRoomRes = await db.collection(collectionNames.rooms).updateOne({ _id: NEWS_ROOM }, updateDoc, { session })
            console.log(`${updateRoomRes.modifiedCount} doc(s) was/were updated to rooms collection`)
            finalResult.message = `add new message to news room success`
        }, transactionOptions)
        pubsub.publish("userListInbox", { updateInboxList: true });
        //Create success logs
        saveSuccessLog(ticket, args, chat_api_system_publish_news.name, finalResult.message, clientIp)
        return finalResult
    } catch (e) {
        //Create error logs
        const errorResult = JSON.stringify({
            name: e.name,
            message: e.message,
            stack: e.stack
        })
        saveErrorLog(ticket, args, chat_api_system_publish_news.name, errorResult, clientIp)
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        ErrorResolve(e, args, chat_api_system_publish_news.name)
    } finally {
        session.endSession()
    }
}

export { setNewestNewsRoomMessage, getNewestNewsRoomMessage, newest_news_room_message }