import { Mutation } from "./mutations";
import { Query } from "./queries";
import { Subscription } from "./subscriptions";

export const resolvers = {
  Query,
  Mutation,
  Subscription,
  Result: {
    __resolveType(obj, context, info){
      if(obj.title){
        return 'ChatRoom';
      }

      if(obj.chatRoomId){
        return 'Message';
      }

      if(obj.inboxRoomId){
        return 'InboxMessage'
      }

      return null;
    },
  },
};
