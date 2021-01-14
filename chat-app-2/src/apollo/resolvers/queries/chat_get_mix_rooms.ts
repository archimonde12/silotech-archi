
import { MemberInMongo } from "../../../models/Member";
import { InboxRoom, RoomTypes } from "../../../models/Room";
import { collectionNames, db } from "../../../mongo";
import { getSlugByToken } from "../../../ulti";

const chat_get_mix_rooms = async (root: any, args: any, ctx: any) => {
    console.log("=====GET MIX ROOMS=====")
    //Get arguments
    console.log({ args });
    const token = ctx.req.headers.authorization
    const {limit=5,skip=0 } = args
    //Check arguments
    const slug = await getSlugByToken(token)
    
    try {
        const membersData:MemberInMongo[] = await db
        .collection(collectionNames.members)
        .aggregate([
            {
                $match: {
                    slug
                }
            },
            {
                $lookup:
                {
                    from: collectionNames.rooms,
                    localField: 'roomId',
                    foreignField: '_id',
                    as: 'roomDetails'
                }
            }, 
        ]).toArray();
        const AllRoomIdsOfSlug=membersData.map(member=>member.roomId)
        console.log({AllRoomIdsOfSlug})
        const allRooms:InboxRoom[] = await db.collection(collectionNames.rooms).find({ $or: [{_id:{$in:AllRoomIdsOfSlug}},{ pair: { $all: [{ slug }] } }] }).sort({"lastMess.sentAt":-1}).limit(limit).skip(skip).toArray()
        console.log({allRooms})
        const sortFunc = (a, b) => {
            if(a.lastMess.sentAt < b.lastMess.sentAt) { return 1; }
            if(a.lastMess.sentAt > b.lastMess.sentAt) { return -1; }
            return 0;
        }
        allRooms.sort(sortFunc)
        return allRooms.slice(0,limit)
    } catch (e) {
        throw e;
    }
}

export { chat_get_mix_rooms }