import { PubSub, withFilter } from "apollo-server";
import { ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";

import { createInboxRoomKey, getSlugByToken } from "../../../ulti";
export const pubsub = new PubSub();
export const LISTEN_CHANEL = "MESSAGE_SEND";

const Subscription = {
  room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([LISTEN_CHANEL]),
      (payload, variables) => {
        const { roomType, roomKey } = variables
        if (roomType === "global") return payload.room_listen.roomKey === GLOBAL_KEY
        return (
          payload.room_listen.roomKey === roomKey
        );
      }
    ),
  },
  inbox_room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([LISTEN_CHANEL]),
      async (payload, variables) => {
        console.log("====NEW INBOX MESSAGE====")
        const { token, reciverSlug } = variables
        const senderSlug=await getSlugByToken(token)
        console.log({senderSlug})
        const roomKey = createInboxRoomKey(senderSlug, reciverSlug)
        console.log(roomKey)
        return (
          payload.inbox_room_listen.roomKey === roomKey
        );
      }
    ),
  }
};
export { Subscription };
