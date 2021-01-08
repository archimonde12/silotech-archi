import { ObjectId } from "mongodb";
import { Member, MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import { client, collectionNames, db, transactionOptions } from "../../../mongo";
import { checkRoomIdInMongoInMutation, checkUsersInDatabase, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_add = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM ADD=====");
  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, addMemberSlugs } = args;
  const objectRoomId = new ObjectId(roomId);
  const totalAddMember = addMemberSlugs.length;

  //Check arguments
  if (!token || !roomId || !addMemberSlugs)
    throw new Error("all arguments must be provided");
  if (!roomId.trim()) throw new Error("roomId must be provided");

  if (addMemberSlugs.length === 0)
    throw new Error("addMemberSlugs must be provided");

  //Start transcation
  const session = client.startSession();
  try {
    //Verify token and get slug
    const admin = await getSlugByToken(token);
    let finalResult: ResultMessage = {
      success: false,
      message: '',
      data: null
    }
    if (addMemberSlugs.includes(admin)) {
      throw new Error("Cannot add yourself");
    }
    const transactionResults: any = await session.withTransaction(async () => {
      //Check roomId exist
      const RoomData:RoomInMongo|null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if(!RoomData){
        console.log('0 document was found in the room collection')
        await session.abortTransaction(); 
        finalResult.message=`Cannot find a room with roomId=${roomId}`
        return
      }
      console.log('1 document was found in the room collection')
      //Check room type
      if (RoomData.type === `global`) {
        await session.abortTransaction();
        throw new Error("This is global room!you can do anything");
      }
      //Check addMemberSlugs exist
      let slugsInDatabase = await checkUsersInDatabase(addMemberSlugs, session)
      if (slugsInDatabase.length !== addMemberSlugs.length) {
        await session.abortTransaction();
        finalResult.message = `${addMemberSlugs.filter(slug => !slugsInDatabase.includes(slug))} is not exist in database!`
        return
      }
      //Check member
      const checkOldMembersArray = [...addMemberSlugs, admin];
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(
          {
            $and: [
              { roomId: objectRoomId },
              { slug: { $in: checkOldMembersArray } },
            ],
          },
          { session }
        )
        .toArray();
      console.log(`${checkOldMembers.length} member document(s) was/were found in the members collection`);
      if (checkOldMembers.length > 1) {
        await session.abortTransaction();
        finalResult.message = `Someone has already been a member`;
        return
      }
      //Check block
      const checkBlockMembers = await db
        .collection(collectionNames.blockMembers)
        .find(
          {
            $and: [
              { roomId: objectRoomId },
              { slug: { $in: checkOldMembersArray } },
            ],
          },
          { session }
        )
        .toArray();
      console.log(`${checkBlockMembers.length} block member document(s) was/were found in the blockMembers collection`);
      if (checkBlockMembers.length > 0) {
        await session.abortTransaction();
        finalResult.message = `Someone has been blocked`
        return
      }
      //Check admin role
      if (
        !checkOldMembers[0] ||
        checkOldMembers[0].role === MemberRole.member.name
      ) {
        await session.abortTransaction();
        finalResult.message = `${admin} is not a admin of this room`
        return;
      }
      //Create new member doc
      const now = new Date();
      let insertMemberDocs: Member[] = addMemberSlugs.map((memberSlug) => ({
        slug: memberSlug,
        roomId: objectRoomId,
        joinedAt: now,
        role: MemberRole.member.name,
      }));
      const insertRes = await db
        .collection(collectionNames.members)
        .insertMany(insertMemberDocs, { session });
      console.log(`${insertRes.insertedCount} new member document(s) was/were inserted in the Members collection`)
      //Update room doc
      const { modifiedCount } = await db
        .collection(collectionNames.rooms)
        .updateOne(
          { _id: objectRoomId },
          { $inc: { totalMembers: totalAddMember } },
          { session }
        );
      console.log(`${modifiedCount} document(s) was/were updated in rooms collection to include adding new member`)
      const listenData = {
        roomId: roomId.toString(),
        content: `${addMemberSlugs} has been added`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult= {
        success: true,
        message: `add ${totalAddMember} new member(s) success!`,
        data: null,
      };
    }, transactionOptions)
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession()
    return finalResult
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null
    }
  }
};
export { chat_room_add };
