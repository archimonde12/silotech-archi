import { ObjectId } from "mongodb";
import { MemberInMongo, MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
import { RoomInMongo } from "../../../models/Room";
import {
  collectionNames,
  db,
  client,
  transactionOptions,
} from "../../../mongo";
import { checkRoomIdInMongoInMutation, getSlugByToken } from "../../../ulti";
import { LISTEN_CHANEL, pubsub } from "../subscriptions";

const chat_room_set_role = async (
  root: any,
  args: any,
  ctx: any
): Promise<any> => {
  console.log("=====ROOM SET ROLE=====");

  //Get arguments
  console.log({ args });
  const token = ctx.req.headers.authorization;
  const { roomId, memberSlug, roleSet } = args;
  if (!token || !roomId || !memberSlug || !roleSet)
    throw new Error("all arguments must be provided");
  const roleToSet =
    roleSet === "admin" ? MemberRole.admin.name : MemberRole.member.name;
  const objectRoomId = new ObjectId(roomId);

  //Check arguments
  if (!roomId.trim()) throw new Error("roomId must be provided");

  if (!memberSlug.trim()) throw new Error("member must be provided");

  //Start transaction
  const session = client.startSession();

  try {
    //Verify token and get slug
    const master = await getSlugByToken(token);
    if (master === memberSlug) {
      throw new Error("cannot set role for your self");
    }
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    //Check roomId exist
    const transactionResults: any = await session.withTransaction(async () => {
      const RoomData: RoomInMongo | null = await checkRoomIdInMongoInMutation(objectRoomId, session);
      if (!RoomData) {
        console.log('0 document was found in the room collection')
        await session.abortTransaction();
        finalResult.message = `Cannot find a room with roomId=${roomId}`
        return
      }
      console.log('1 document was found in the room collection')
      //Check master
      if (master !== RoomData.createdBy.slug) {
        await session.abortTransaction();
        finalResult.message = `${master} is not a owner of this room`;
        return;
      }

      //Check member
      const checkOldMemFilter = {
        $and: [
          { roomId: objectRoomId },
          { slug: { $in: [master, memberSlug] } },
        ],
      };
      const checkOldMembers: MemberInMongo[] = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      // console.log({ checkOldMembers });
      console.log(`${checkOldMembers.length}/2 document(s) was/were found in the members collection`)
      if (checkOldMembers.length !== 2) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is not a member in this room`;
        return;
      }
      const memberData: MemberInMongo = checkOldMembers.filter(
        (member) => member.slug === memberSlug
      )[0];

      //Update new change
      const updateRoleRes = await db
        .collection(collectionNames.members)
        .updateOne(
          { $and: [{ roomId: objectRoomId }, { slug: memberSlug }] },
          { $set: { role: roleToSet } },
          { session }
        );
      memberData.role = roleToSet
      console.log(`${updateRoleRes.modifiedCount} document was updated in the members collection. Field change = role`);
      const listenData = {
        roomId: roomId.toString(),
        content: `${memberSlug} became ${roleToSet}!`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        success: true,
        message: `${memberSlug} became ${roleToSet}!`,
        data: memberData,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The transaction was successfully committed.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected ${e}`,
      data: null,
    };
  }
};

export { chat_room_set_role };
