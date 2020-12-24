import { ObjectId } from "mongodb";
import { collectionNames, db } from "../../../mongo";

const get_all_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET ALL ROOMS=====");
    //Get arguments
    console.log({ args });
    const { slug } = args;
    try {
        //Check member data
        const membersData = await db
            .collection(collectionNames.members)
            .aggregate([
                {
                    $lookup:
                    {
                        from: collectionNames.rooms,
                        localField: 'roomId',
                        foreignField: '_id',
                        as: 'roomDetails'
                    }
                }, {
                    $match: {
                        slug
                    }
                }
            ]).toArray();
        console.log({membersData})
        let slugRooms=membersData.map(member=>member.roomDetails[0])
        const sortFunc=(a,b)=>{
            return b.updatedAt-a.updatedAt
        }
        slugRooms.sort(sortFunc)
        return slugRooms
    } catch (e) {
        throw e;
    }
}
export { get_all_rooms }