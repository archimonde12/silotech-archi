import { ObjectId } from "mongodb";
import { collectionNames, db } from "../../../mongo";

const chat_get_room_details = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ROOM DETAILS=====");
    //Get arguments
    console.log({ args });
    const { roomId } = args;
    if(!roomId) throw new Error("all arguments must be provided")
    const objectRoomId = new ObjectId(roomId);
    try {
        //Check roomId exist
        const RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        console.log({ RoomData });
        if (!RoomData) {
            throw new Error("RoomId not exist");
        }
        return RoomData
    } catch (e) {
        throw e;
    }
}
export { chat_get_room_details }