import { gql } from "apollo-server";

export const typeDefs = gql`

#Add your type Define
#Example:
#type User{
    #id:ID!
    #userName:String!
    #age:Int!
    #height:Float
    #isDead:Boolean
#}
#Five common scalar: String,Int,Float,Boolean,Id

type Query {
    # Add your query define 
    # Example: 
    #FindAllUser:[User]
    #sayHello:String
}

type Mutation {
  # Add your mutation define 
  # Example: 
  # CreateNewUser(userName:String!):User
}

type Subscription{
    # Add your subscription define 
    # Example: 
    # ListenForNewUser:User
}
`;
