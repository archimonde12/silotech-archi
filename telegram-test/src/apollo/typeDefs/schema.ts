import { gql } from "apollo-server";
type Result = {
  error: string 
  result: string 
}

export const typeDefs = gql`
  type Query{
    test:String
  }

  type Result{
    error:String
    result:String
  }

  input User{
    auth_date: Int!
    first_name: String!
    hash: String!
    id: Int!
    last_name: String!
  }

  type Mutation{
    handle_telegram_user_info(user:User!):Result
  }

  # type Mutation{}
  # type Subscription{}
`;

export { Result }
