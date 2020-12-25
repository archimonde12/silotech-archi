import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";

const get_all_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ALL ROOMS=====");
    try {
        //Get all public room
        const allRooms = await db.collection(collectionNames.rooms).find({ $or: [{ type: RoomTypes.public }, { type: RoomTypes.global }] }).toArray()
        console.log({ allRooms })
        const sortFunc = (a, b) => {
            if(a.type < b.type) { return -1; }
            if(a.type > b.type) { return 1; }
            return 0;
        }
        allRooms.sort(sortFunc)
        return allRooms
    } catch (e) {
        throw e;
    }
}
export { get_all_rooms }