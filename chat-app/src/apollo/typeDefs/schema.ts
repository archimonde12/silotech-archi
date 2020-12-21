import { gql } from "apollo-server";

export const typeDefs = gql`
  scalar ObjectID
  scalar Date

  enum FriendRequestStatus {
    pending
    accept
    reject
    reject_life_time
  }

  type ChatRoom {
    _id: ObjectID!
    createBy: User
    title: String
    blockMembers: [User]
    createdAt: Date
  }

  type PrivateRoom {
    id: ID!
    member1: User!
    member2: User!
    createAt: Int
  }

  type User {
    id: ID!
    slug: String!
    friend: [String]
    block: [String]
    chatRooms:[ObjectID]
  }

  type Message {
    chatRoomId: ID!
    content: String
    owner: User!
    tag: [User]
  }

  type FriendRequest {
    id: ID!
    sender: String!
    reciver: String!
    createAt: Int
    status: FriendRequestStatus!
  }

  type ResultMessage {
    success: Boolean!
    content: String
  }

  type Query {
    chat_app_get_all_message(chatRoomId: ID!): [Message]
    chat_app_show_all_user: [User]
    chat_app_show_all_chatroom: [ChatRoom]
  }

  type Mutation {
    # public room
    chat_app_public_room_create(
      slug: String!
      title: String!
      member: [String!]!
    ): ChatRoom!
    chat_app_public_room_delete(
      slug: String!
      chatRoomId: ID!
    ): ChatRoom!
    chat_app_public_room_quit(
      slug: String!
      chatRoomId: ID!
    ): ChatRoom!
    chat_app_public_room_join(slug: String!, chatRoomId: ID!): ChatRoom!
    chat_app_public_room_add_member(
      slug: String!
      member: [String!]
      chatRoomId: ID!
    ): ChatRoom!
    chat_app_public_room_remove_member(
      slug: String!
      member: [String!]
      chatRoomId: ID!
    ): ChatRoom!
    chat_app_public_room_block_member(
      slug: String!
      blockMember: [String!]
      chatRoomId: ID!
    ): ChatRoom!
    # private room
    chat_app_private_room_create(slug1: String!, slug2: String!): PrivateRoom!
    # send message
    chat_app_send_message(
      chatRoomId: ID!
      slug: String!
      content: String!
      tag: [String]
    ): Message!
    #friend request
    chat_app_friend_request_send(
      sender: String!
      reciver: String!
    ): FriendRequest!
    chat_app_friend_request_accept(friendRequestId: ID!): FriendRequest!
    chat_app_friend_request_reject_one_time(
      friendRequestId: ID!
    ): FriendRequest!
    chat_app_friend_request_reject_life_time(
      friendRequestId: ID!
    ): FriendRequest!
  }

  type Subscription {
    chat_app_listen_chat_room(chatRoomId: ID!): Message
  }
`;
