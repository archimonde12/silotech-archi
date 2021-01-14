import { NEWS_ROOM } from "../../../config";
import { Message, MessageInMongo, MessageTypes } from "../../../models/Message";
import { ResultMessage } from "../../../models/ResultMessage";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { getAsync } from "../../../redis";
import { LISTEN_CHANEL, LIST_INBOX_CHANEL, pubsub } from "../subscriptions";

let newest_news_room_message:MessageInMongo|null=null
const setNewestNewsRoomMessage=(_message:MessageInMongo)=>{
    newest_news_room_message=_message
}

const getNewestNewsRoomMessage=async ()=>{
    if(!newest_news_room_message){
        const key='chat-api.news_room.last_message'
        const getFromRedis=await getAsync(key)
        if(!getFromRedis){
            return null
        }
        return JSON.parse(getFromRedis)
    }
    return newest_news_room_message
}

const chat_system_publish_news = async (root: any,
    args: any,
    ctx: any
): Promise<any> => {
    console.log("====SYSTEM PUBLISH NEWS====")
    //Get arguments
    const { data } = args
    //Start transaction
    const session = client.startSession();
    try {
        let finalResult: ResultMessage = {
            success: false,
            message: '',
            data: null
        }
        const transactionResults: any = await session.withTransaction(async () => {
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
            setNewestNewsRoomMessage({...newMessage,_id:insertRes.insertedId})
            //Update news room 
            const updateDoc = {
                $set: {
                    updatedAt: now,
                    lastMess: newMessage
                }
            }
            const updateRoomRes = await db.collection(collectionNames.rooms).updateOne({ _id: NEWS_ROOM }, updateDoc, { session })
            console.log(`${updateRoomRes.modifiedCount} doc(s) was/were updated to rooms collection`)

            finalResult.success = true
            finalResult.message = `add new message to news room success`
        }, transactionOptions)
        if (!transactionResults) {
            console.log("The transaction was intentionally aborted.");
        } else {
            console.log("The transaction was successfully committed.");
        }
        session.endSession();
        pubsub.publish("userListInbox", { updateInboxList: true });
        return finalResult;
    }
    catch (e) {
        console.log("The transaction was aborted due to an unexpected error: " + e);
        return {
            success: false,
            message: `Unexpected Error: ${e}`,
            data: null
        }
    }
}

export { chat_system_publish_news,newest_news_room_message,setNewestNewsRoomMessage,getNewestNewsRoomMessage}