import { ObjectId } from "mongodb";
import { MemberRole } from "../../../models/Member";
import { client, collectionNames, db } from "../../../mongo";

const room_add = async (root: any, args: any, ctx: any): Promise<any> => {
  console.log("======ROOM ADD=====");
  //Get arguments
  console.log({ args });
  const { newMemberSlug, roomId } = args;
  const objectRoomId = new ObjectId(roomId);
};
export { room_add };
