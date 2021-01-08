import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { ResultMessage } from "../../../models/ResultMessage";
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
  console.log({ roleToSet });
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
      await session.abortTransaction();
      throw new Error("cannot set role for your self");
    }
    let finalResult: ResultMessage = {
      success: false,
      message: "",
      data: null,
    };
    //Check roomId exist
    const RoomData = await checkRoomIdInMongoInMutation(objectRoomId, session);
    const transactionResults: any = await session.withTransaction(async () => {
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
      const checkOldMembers = await db
        .collection(collectionNames.members)
        .find(checkOldMemFilter, { session })
        .toArray();
      console.log({ checkOldMembers });
      if (checkOldMembers.length !== 2) {
        await session.abortTransaction();
        finalResult.message = `${memberSlug} is not a member in this room`;
        return;
      }
      const memberData = checkOldMembers.filter(
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
      console.log({ modifiedCount: updateRoleRes.modifiedCount });
      const listenData = {
        roomKey: roomId.toString(),
        content: `${memberSlug} became ${roleToSet}!`,
      };
      pubsub.publish(LISTEN_CHANEL, { room_listen: listenData });
      finalResult = {
        success: true,
        message: `${memberSlug} became ${roleToSet}!`,
        data: null,
      };
    }, transactionOptions);
    if (!transactionResults) {
      console.log("The transaction was intentionally aborted.");
    } else {
      console.log("The reservation was successfully created.");
    }
    session.endSession();
    return finalResult;
  } catch (e) {
    console.log("The transaction was aborted due to an unexpected error: " + e);
    return {
      success: false,
      message: `Unexpected Error: ${e}`,
      data: null,
    };
  }
};

export { chat_room_set_role };
