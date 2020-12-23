import { PubSub, withFilter } from "apollo-server";
export const pubsub = new PubSub();

const Subscription = {
    room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator('COMMENT_ADDED'),
      (payload, variables) => {
       return payload.room_listen.roomId===variables.roomId;
      },
    ),
  },
};
export { Subscription };
