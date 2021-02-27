import { PubSub, withFilter } from "apollo-server";
import { ObjectId } from "mongodb";
import { GLOBAL_KEY } from "../../../config";

import { createInboxRoomKey, getSlugByToken, queryInbox } from "../../../utils";
export const pubsub = new PubSub();
export const LISTEN_CHANEL = "MESSAGE_SEND";
export const LIST_INBOX_CHANEL = "LIST_INBOX"

const Subscription = {
  room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([LISTEN_CHANEL]),
      (payload, variables, ctx) => {
        console.log({ payload })
        console.log({ variables })
        const token = ctx.connection.context.authorization;

        const { roomType, roomId } = variables
        if (roomType === "global") return payload.room_listen.roomId === GLOBAL_KEY
        return (
          payload.room_listen.roomId === roomId
        );
      }
    ),
  },
  inbox_room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([LISTEN_CHANEL]),
      async (payload, variables, ctx) => {
        console.log("====NEW INBOX MESSAGE====")
        const token = ctx.connection.context.authorization;
        console.log({ token })
        const { receiverSlug } = variables
        const senderSlug = await getSlugByToken(token)
        console.log(senderSlug, receiverSlug)
        console.log({ payload })
        const roomKey = createInboxRoomKey(senderSlug, receiverSlug)
        return (
          payload.inbox_room_listen.roomId === roomKey
        );
      }
    ),
  },
  userListInbox: {
    resolve: async (payload, variables, ctx) => {
      const token = ctx.connection.context.authorization;
      const user = await getSlugByToken(token)
      const result = await queryInbox(user, 10)
      return result
    },
    subscribe: () => pubsub.asyncIterator("userListInbox")
  }

};
export { Subscription };
