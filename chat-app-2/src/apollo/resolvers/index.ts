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
        return 'Room';
      }

      if(obj.content){
        return 'Message';
      }

      if(obj.role){
        return 'Member'
      }
      
      return null;
    },
  },
};
