import { ObjectId } from "mongodb";
import { collectionNames, db } from "../../../mongo";

const get_all_members = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ALL MEMBERS=====");
    //Get arguments
    console.log({ args });
    const { roomId } = args;
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
        //Check member
        const membersData = await db
            .collection(collectionNames.members)
            .find({ roomId: objectRoomId }).toArray();
        console.log({ membersData });
        if(membersData.length===RoomData.totalMembers){
            return membersData
        }
        throw new Error("Get members error");
    } catch (e) {
        throw e;
    }
}
export { get_all_members }