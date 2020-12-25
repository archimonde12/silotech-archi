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
    chatRoomId: ObjectID!
    type:String
    content: String
    createdBy: User!
    tag: [User]
    createdAt:Date
  }

  type InboxMessage {
    inboxRoomId: ObjectID!
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
    # Message
    chat_app_get_all_message(slug:String!,chatRoomId: ObjectID!): [Message]
    chat_app_get_all_inbox_message(slug:String!,inboxRoomId: ObjectID!): [InboxMessage]
    # Chatroom and InboxRoom
    chat_app_show_all_public_chatrooms(slug:String!): [ChatRoom]
    chat_app_show_all_my_chatrooms(slug:String!): [ChatRoom]
    chat_app_show_all_inboxroom(slug:String!): [InboxRoom]
    chat_app_show_chatroom_details(chatRoomId: ObjectID!): ChatRoomDetails
    chat_app_show_all_user: [User]
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
      chatRoomId: ObjectID!
    ): ResultMessage!

    chat_app_public_room_leave(
      slug: String!
      chatRoomId: ID!
    ): ResultMessage!

    chat_app_public_room_join(slug: String!, chatRoomId: ObjectID!): ChatRoom!

    chat_app_public_room_add_member(
      master: String!
      member: [String!]
      chatRoomId: ObjectID!
    ): ChatRoom!

    chat_app_public_room_remove_member(
      master: String!
      member: [String!]
      chatRoomId: ObjectID!
    ): ChatRoom!
    chat_app_public_room_block_member(
      slug: String!
      blockMember: [String!]
      chatRoomId: ObjectID!
    ): ChatRoom!

    # private room

    chat_app_inbox_get_room(sender: String!, reciver: String!): InboxRoom!

    # send message

    chat_app_send_message(
      chatRoomId: ObjectID!
      slug: String!
      content: String!
      tag: [String]
    ): ResultMessage!

    chat_app_send_inbox_message(
      inboxRoomId: ObjectID!
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
