import { PubSub, withFilter } from "apollo-server";
export const pubsub = new PubSub();

const Subscription = {
  chat_app_listen_chat_room: {
    subscribe: () => pubsub.asyncIterator(["test"]),
  },
};

export { Subscription };
