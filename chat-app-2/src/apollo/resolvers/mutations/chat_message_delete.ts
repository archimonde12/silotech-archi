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
  console.log("======MESSAGE SEND=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, messageId } = args;
  //Check arguments
  if (!token || !messageId || !roomId)
    throw new Error("all arguments must be provided");
  const objectRoomId = new ObjectId(roomId);
  const objectMessageId = new ObjectId(messageId);

  //Start transaction
  const session = client.startSession();

  try {
    //Verify token and get slug
    const master = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: '',
      data: null
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the rooms collection')
        await session.abortTransaction();
        finalResult.message = `Cannot find a room with roomId=${roomId}`
        return
      }
      console.log('1 document was found in the room collection')
      //Check master
      if (master !== RoomData.createdBy.slug) {
        await session.abortTransaction();
        finalResult.message = `${master} is not a master of this room`
        return
      }
      //Check message
      const MessageData: MessageInMongo | null = await db
        .collection(collectionNames.messages)
        .findOne({ _id: objectMessageId }, { session });
      // console.log({ MessageData });
      if (!MessageData) {
        console.log('0 document was found in the messages collection')
        await session.abortTransaction();
        finalResult.message = `MessageId not exist`
        return
      }
      console.log('1 document was found in the messages collection')
      //Delete message
      const deleteMessageRes: DeleteWriteOpResultObject = await db
        .collection(collectionNames.messages)
        .deleteOne({ _id: objectMessageId }, { session });
      // console.log(deleteMessageRes);
      console.log(`${deleteMessageRes.deletedCount} document was deleted in the messages collection`)
      if (deleteMessageRes.deletedCount === 0) {
        await session.abortTransaction();
        finalResult.message = `Deleted message fail`
        return
      }
      const listenData = {
        roomId,
        deleteMessageId: MessageData._id,
        content: `${MessageData._id} message has been delete!`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        success: true,
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
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null
    }
  }
};
export { chat_message_delete };
