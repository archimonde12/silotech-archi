import { PubSub, withFilter } from "apollo-server";
import { ObjectId } from "mongodb";
export const pubsub = new PubSub();
export const LISTEN_CHANEL = "MESSAGE_SEND";

const Subscription = {
  room_listen: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([LISTEN_CHANEL]),
      (payload, variables) => {
        return (
          payload.room_listen.roomId.toString() === variables.roomId.toString()
        );
      }
    ),
  },
};
export { Subscription };
