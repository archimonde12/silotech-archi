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

  input UserData{
    auth_date: Int!
    first_name: String!
    hash: String!
    id: Int!
    last_name: String!
    username:String!
  }

  input googleUserData{
    id_token:String!
  }

  type Mutation{
    handle_telegram_user_info(userData:UserData!):Result
    handle_google_user_info(googleUserData:googleUserData!):Result
  }

  # type Mutation{}
  # type Subscription{}
`;

export { Result }
