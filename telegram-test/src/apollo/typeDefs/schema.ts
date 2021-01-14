import { gql } from "apollo-server";

export const typeDefs = gql`
  type Query{
    test:String
  }

  # type Mutation{}
  # type Subscription{}
`;
