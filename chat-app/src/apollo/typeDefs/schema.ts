import { gql } from "apollo-server";

export const typeDefs = gql`
  scalar ObjectID
  scalar Date

  union Result = ChatRoom | Message | InboxMessage

  enum FriendRequestStatus {
    pending
    accept
    reject
    reject_life_time
  }

  type ChatRoom {
    _id: ObjectID!
    createdBy: User
    title: String
    totalMembers:Int
    blockMembers: [User]
    createdAt: Date
    updateAt:Date
  }

  type ChatRoomDetails{
    data:ChatRoom
    member:[User]
  }

  type InboxRoom{
    _id: ObjectID!
    pairName:String
    members:[String]
    createdAt:Date
    updateAt:Date
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
    createdBy: User!
    tag: [User]
    createdAt:Date
  }

  type InboxMessage {
    inboxRoomId: ID!
    content: String
    createdBy: User!
    createdAt:Date
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
    message: String
    data:Result
  }

  type Query {
    chat_app_get_all_message(slug:String!,chatRoomId: ID!): [Message]
    chat_app_show_all_user: [User]
    chat_app_show_all_chatroom: [ChatRoom]
    chat_app_show_chatroom_details(chatRoomId: ID!): ChatRoomDetails
  }

  type Mutation {
    # public room
    chat_app_public_room_create(
      slug: String!
      title: String!
      member: [String!]!
    ): ResultMessage!

    chat_app_public_room_delete(
      slug: String!
      chatRoomId: ID!
    ): ResultMessage!

    chat_app_public_room_leave(
      slug: String!
      chatRoomId: ID!
    ): ResultMessage!

    chat_app_public_room_join(slug: String!, chatRoomId: ID!): ChatRoom!

    chat_app_public_room_add_member(
      master: String!
      member: [String!]
      chatRoomId: ID!
    ): ChatRoom!

    chat_app_public_room_remove_member(
      master: String!
      member: [String!]
      chatRoomId: ID!
    ): ChatRoom!
    chat_app_public_room_block_member(
      slug: String!
      blockMember: [String!]
      chatRoomId: ID!
    ): ChatRoom!

    # private room

    chat_app_inbox_get_room(sender: String!, reciver: String!): InboxRoom!

    # send message

    chat_app_send_message(
      chatRoomId: ID!
      slug: String!
      content: String!
      tag: [String]
    ): ResultMessage!

    chat_app_send_inbox_message(
      inboxRoomId: ID!
      slug: String!
      content: String!
    ): ResultMessage!

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
