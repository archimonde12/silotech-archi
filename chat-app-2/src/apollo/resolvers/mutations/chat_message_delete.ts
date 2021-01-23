import { DeleteWriteOpResultObject, ObjectId } from "mongodb";
import { MessageInMongo } from "../../../models/Message";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_message_delete = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  //Start transaction
  const session = client.startSession();

  try {
    console.log("======MESSAGE SEND=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization;
    const { roomId, messageId } = args;
    //Check arguments
    if (!messageId ) throw new Error("CA:019");
    if(!roomId) throw new Error("CA:020")
    const objectRoomId = new ObjectId(roomId);
    const objectMessageId = new ObjectId(messageId);
    //Verify token and get slug
    const master = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the rooms collection')
        throw new Error("CA:015")
      }
      console.log('1 document was found in the room collection')
      //Check master
      if (master !== RoomData.createdBy.slug) throw new Error("CA:017")
  
      //Check message
      const MessageData: MessageInMongo | null = await db
        .collection(collectionNames.messages)
        .findOne({ _id: objectMessageId }, { session });
      // console.log({ MessageData });
      if (!MessageData) {
        console.log('0 document was found in the messages collection')
        throw new Error("CA:018")
      }
      console.log('1 document was found in the messages collection')
      //Delete message
      const deleteMessageRes: DeleteWriteOpResultObject = await db
        .collection(collectionNames.messages)
        .deleteOne({ _id: objectMessageId }, { session });
      // console.log(deleteMessageRes);
      console.log(`${deleteMessageRes.deletedCount} document was deleted in the messages collection`)
      const listenData = {
        roomId,
        deleteMessageId: MessageData._id,
        content: `${MessageData._id} message has been delete!`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        message: `Delete message success!`,
        data: null
      };
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    await session.abortTransaction();
    console.log("The transaction was aborted due to : " + e);
    if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
      throw new Error(e.message)
    } else {
      throw new Error("CA:004")
    }
  }
};
export { chat_message_delete };
