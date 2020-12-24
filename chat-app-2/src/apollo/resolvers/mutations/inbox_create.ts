import { ObjectId } from "mongodb";
import { ADMIN_KEY } from "../../../config";
import { MemberRole } from "../../../models/Member";
import { RoomTypes } from "../../../models/Room";
import { client, collectionNames, db } from "../../../mongo";
import { createPairName } from "../../../ulti";

const inbox_create = async (root: any, args: any, ctx: any): Promise<any> => {
    console.log("======INBOX CREATE=====");
    //Get arguments
    console.log({ args });
    const { senderSlug, reciverSlug } = args;
    const checkSlugs = [senderSlug, reciverSlug]
    const inboxTitle = createPairName(senderSlug, reciverSlug)
    //Start transcation
    const session = client.startSession();
    session.startTransaction();
    try {
        //Check slug and member exist in database
        const findUsersRes = await db
            .collection(collectionNames.users)
            .find({ slug: { $in: checkSlugs } })
            .toArray();
        if (findUsersRes.length !== 2) {
            await session.abortTransaction();
            session.endSession();
            throw new Error("someone not exist in database!");
        }
        //Check inbox room exist
        const inboxRoomData = await db
            .collection(collectionNames.rooms)
            .findOne({$and:[{ title: inboxTitle }, { type: RoomTypes.inbox }]});
        console.log({ inboxRoomData });
        if (inboxRoomData) {
            await session.abortTransaction();
            session.endSession();
            return inboxRoomData
        }
        //Create new inboxroom Doc
        const now = new Date();
        const insertInboxRoomDoc = {
            title: inboxTitle,
            createdBy: { slug: 'admin' },
            type: RoomTypes.inbox,
            createdAt: now,
            updatedAt: now,
            totalMembers: 2,
            lastMess: null
        }
        console.log({ insertInboxRoomDoc })
        const { insertedId } = await db
            .collection(collectionNames.rooms)
            .insertOne(insertInboxRoomDoc);
        console.log(insertedId);
        //Insert member docs
        let insertMemberDocs = checkSlugs.map((slug) => ({
            slug,
            roomId: insertedId,
            joinedAt: now,
            role: MemberRole.member.id,
          }));
          console.log(insertMemberDocs);
          await db.collection(collectionNames.members).insertMany(insertMemberDocs);
          await session.commitTransaction();
          session.endSession();
          const result = { ...insertInboxRoomDoc, _id: insertedId };
          return result
    } catch (e) {
        if (session.inTransaction()) {
            await session.abortTransaction();
            session.endSession();
        }
        throw e;
    }
}

export { inbox_create };