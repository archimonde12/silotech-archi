import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { captureExeption } from "../../../sentry";

const chat_get_all_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    try {
        const { pageSize = 10, page = 1 } = args;
        if (pageSize < 1 || page < 1) throw new Error("CA:059")
        console.log("======GET ALL ROOMS=====");
        //Get all public room
        const allRooms = await db.collection(collectionNames.rooms).find({ $or: [{ type: RoomTypes.public }, { type: RoomTypes.global }] }).sort({ "lastMess.sentAt": -1 }).limit(pageSize).skip(pageSize * (page - 1)).toArray()
        console.log(`${allRooms.length} document was found in the rooms collection`)
        return allRooms
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
export { chat_get_all_rooms }