import { PubSub, withFilter } from "apollo-server";
export const pubsub = new PubSub();

const Subscription = {
  chat_app_listen_chat_room: {
    subscribe: withFilter(
      () => pubsub.asyncIterator('COMMENT_ADDED'),
      (payload, variables) => {
       return payload.chat_app_listen_chat_room.chatRoomId===variables.chatRoomId;
      },
    ),
  },
};
/* const { chatRoomId } = args
    return {
      subscribe: () => pubsub.asyncIterator([chatRoomId]),
    }
     */

export { Subscription };
