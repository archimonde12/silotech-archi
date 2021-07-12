import { setNewestNewsRoomMessage } from "../../apollo/resolvers/mutations/chat_api_system_publish_news";
import { pubsub } from "../../apollo/resolvers/subscriptions";
import { NEWS_ROOM } from "../../config";
import { Message, MessageTypes } from "../../models/Message";
import { client, collectionNames, db, transactionOptions } from "../../mongo"
import { setAsync } from "../../redis";
import { CallReturn } from "./call";

const server_publish_news = async (params: { request: any }): Promise<CallReturn> => {
    //Start transaction
    const session = client.startSession();
    try {
        console.log({ params })
        if (!params.request.params) {
            throw new Error("Params not provided")
        }
        const data = JSON.parse(params.request.params).data
        console.log({ data })
        //Check data type
        let finalResult: CallReturn = {
            result: null,
            error: null
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
                finalResult.error = `inserted new messages fail`
                return
            }
            setNewestNewsRoomMessage({...newMessage,_id:insertRes.insertedId})
            //Update news room 
            const updateDoc = {
                $set: {
                    updatedAt: now,
                    lastMess: newMessage
                }
            }
            const updateRoomRes = await db.collection(collectionNames.rooms).updateOne({ _id: NEWS_ROOM }, updateDoc, { session })
            const saveNewsMessageInRedis=await setAsync('chat-api.news_room.last_message',JSON.stringify(newMessage))
            console.log(`Save to redis:`,saveNewsMessageInRedis)
            console.log(`${updateRoomRes.modifiedCount} doc(s) was/were updated to rooms collection`)
            finalResult.result = `add new message to news room success`
        }, transactionOptions)
        session.endSession();
        pubsub.publish("userListInbox", { updateInboxList: true });
        return finalResult;
    } catch (e) {
        console.log("The transaction was aborted due to an unexpected error: " + e);
        return {
            error: `Unexpected Error: ${e}`,
            result: null
        };
    }
}
export { server_publish_news }