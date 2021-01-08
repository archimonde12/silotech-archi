import { ObjectId } from "mongodb";
import { collectionNames, db } from "../../../mongo";

const chat_get_all_members = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ALL MEMBERS=====");
    //Get arguments
    console.log({ args });
    const { roomId } = args;
    const objectRoomId = new ObjectId(roomId);
    //Check arguments
    if(!roomId) throw new Error("all arguments must be provided")
    try {
        //Check roomId exist
        const RoomData = await db
            .collection(collectionNames.rooms)
            .findOne({ _id: objectRoomId });
        // console.log({ RoomData });
        if (!RoomData) {
            console.log('0 document was found in the room collection')
            throw new Error("RoomId not exist");
        }
        console.log('1 document was found in the room collection')
        //Check member
        const membersData = await db
            .collection(collectionNames.members)
            .find({ roomId: objectRoomId }).toArray();
        // console.log({ membersData });
        console.log(`${membersData.length} document(s) was/were found in the room collection`)
        if(membersData.length===RoomData.totalMembers){
            return membersData
        }
        throw new Error("Get members error");
    } catch (e) {
        throw e;
    }
}
export { chat_get_all_members }