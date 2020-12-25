import { Mutation } from "./mutations";
import { Query } from "./queries";
import { Subscription } from "./subscriptions";

export const resolvers = {
  Query,
  Mutation,
  Subscription,
  Result: {
    __resolveType(obj, context, info) {
      if (obj.title) {
        return "Room";
      }

      if (obj.data) {
        return "Message";
      }

      if (obj.role) {
        return "Member";
      }

      return null;
    },
  },
  MessageData: {
    __resolveType(obj, context, info) {
      if (obj.betId) {
        return "BetMessData";
      }

      if (obj.content) {
        return "PlainTextMessData";
      }
      
      return null;
    },
  },
  SubMessage:{
    __resolveType(obj, context, info) {
      if (obj.data) {
        return "Message";
      }

      if (obj.deleteMessageId) {
        return "DeleteNoti";
      }

      if (obj.content) {
        return "SystemMessage";
      }

      return null;
    },
  }
};
