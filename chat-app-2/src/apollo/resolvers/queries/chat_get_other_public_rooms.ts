import { ObjectId } from "mongodb";
import { RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_other_public_rooms = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======GET OTHER PUBLIC ROOMS=====");
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    //Check arguments 
    if (!token || !token.trim()) throw new Error("all arguments must be provided")
    //Verify token and get slug
    const slug = await getSlugByToken(token)
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
        console.log({ membersData })
        const slugRooms = membersData.map(member => member.roomDetails[0])
        console.log({ slugRooms })
        const slugPublicRooms = slugRooms.filter(room => room.type === RoomTypes.public)
        console.log({ slugPublicRooms })
        const slugPublicRoomIds = slugPublicRooms.map(room => room._id.toString())
        console.log({ slugPublicRoomIds })
        //Get all public room
        const allPubLicRooms = await db.collection(collectionNames.rooms).find({ type: RoomTypes.public }).toArray()
        console.log({ allPubLicRooms })
        const otherPublicRoooms = allPubLicRooms.filter(publicroom => !slugPublicRoomIds.includes(publicroom._id.toString()))
        console.log({ otherPublicRoooms })
        const sortFunc = (a, b) => {
            return b.updatedAt - a.updatedAt
        }
        otherPublicRoooms.sort(sortFunc)
        return otherPublicRoooms
    } catch (e) {
        throw e;
    }
}
export { chat_get_other_public_rooms }