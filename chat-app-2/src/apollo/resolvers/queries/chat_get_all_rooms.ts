import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";

const chat_get_all_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    const { limit = 10, skip = 0 } = args;
    console.log("======GET ALL ROOMS=====");
    try {
        //Get all public room
        const allRooms = await db.collection(collectionNames.rooms).find({ $or: [{ type: RoomTypes.public }, { type: RoomTypes.global }] }).sort({"lastMess.sentAt":-1}).limit(limit).skip(skip).toArray()
        console.log({ allRooms })
        // const sortFunc = (a, b) => {
        //     if(a.updatedAt < b.updatedAt) { return -1; }
        //     if(a.updatedAt > b.updatedAt) { return 1; }
        //     return 0;
        // }
        // allRooms.sort(sortFunc)
        return allRooms
    } catch (e) {
        throw e;
    }
}
export { chat_get_all_rooms }