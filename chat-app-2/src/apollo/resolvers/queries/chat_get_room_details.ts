import { ObjectId } from "mongodb";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";

const chat_get_room_details = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ROOM DETAILS=====");
    //Get arguments
    console.log({ args });
    const { roomId } = args;
    if(!roomId) throw new Error("CA:020")
    const objectRoomId = new ObjectId(roomId);
    try {
        //Check roomId exist
        const RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        console.log({ RoomData });
        if (!RoomData) throw new Error("CA:016")
        return RoomData
    } catch (e) {
        console.log(e)
        if (e.message.startsWith("CA:") || e.message.startsWith("AS:")) {
            throw new Error(e.message)
          } else {
            captureExeption(e, { args })
            throw new Error("CA:004")
          }
    }
}
export { chat_get_room_details }