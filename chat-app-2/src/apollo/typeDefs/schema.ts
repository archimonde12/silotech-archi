import { gql } from "apollo-server";

export const typeDefs = gql`
  scalar ObjectID
  scalar Date

  enum CanBeCreateRoomType {
    global
    public
  }

  enum MemberRole{
    admin
    member
  }

  enum MessageType {
    plaintext
    bet
    shareContact
    system
  }

  enum TargetRoomType{
    global
    publicRoom
    inbox
  }

  union Result =  Room | Message | Member
  union MessageData = PlainTextMessData | BetMessData | ShareContactData
  union SubMessage = Message | DeleteNoti | SystemMessage
  union MixRoom=Room|InboxRoom

  input MessData {
    title: String
    betId: String
    content: String
  }

  input MessageInput{
    type: MessageType!
    data: MessData!
  }

  type User {
    slug: String
  }

  type Room {
    _id: ObjectID!
    createdBy: User
    title: String
    type: String
    totalMembers: Int
    createdAt: Date
    updatedAt: Date
    lastMess: Message
  }

  type InboxRoom{
    _id:String!
    pair:[User]!
    type:String
    lastMess:Message
    updatedAt:Date
  }

  type Member {
    slug: String
    roomId: ObjectID
    joinedAt: Date
    role: String
  } 
  
  type SystemMessage{
    roomId:String
    content:String
  }

  type DeleteNoti{
    roomId:ObjectID
    deleteMessageId:ObjectID!
    content:String
  }

  type Message {
    _id:ObjectID!
    roomId:  String
    sentAt: Date
    type: MessageType
    data: MessageData
    createdBy: User
  }

  type ResultMessage {
    message: String
    data: Result
  }

  type PlainTextMessData {
    content: String
  }

  type BetMessData {
    title: String
    betId: String
  }

  type ShareContactData {
     userData:User
  }

  type Query {
    # Search users
    chat_api_usernames_search(search_text:String,limit:Int):[User]
    # Message
    chat_api_messages_in_room_get( roomType:TargetRoomType!,receiver:String, pageSize:Int,page:Int): [Message]
    # Room
    chat_api_room_details_get(roomId: ObjectID!): Room
    chat_api_all_rooms_get(pageSize:Int,page:Int): [Room]
    chat_api_inbox_rooms_get( pageSize:Int,page:Int):[InboxRoom]
    chat_api_mix_rooms_get(pageSize:Int,page:Int):[MixRoom]
    # Member
    chat_api_all_members_get(roomId: ObjectID!,pageSize:Int,page:Int): [Member]
    # Friend
    chat_api_all_friends_get(pageSize:Int,page:Int):[User]
    chat_api_all_friend_request_get(pageSize:Int,page:Int):[User]
  }

  type Mutation {
    # Room
    chat_api_user_room_create(
      title: String!
      startMemberSlugs: [String]!
      roomType: RoomType!
    ): ResultMessage!
    chat_api_user_room_delete( roomId: ObjectID!): ResultMessage!
    chat_api_user_room_join( roomId: ObjectID!): ResultMessage!
    chat_api_user_room_leave( roomId: ObjectID!): ResultMessage!
    chat_api_user_room_add(
      roomId: ObjectID!
      addMemberSlugs: [String]!
    ): ResultMessage!
    chat_api_user_room_remove(
      roomId: ObjectID!
      removeMemberSlugs: [String!]
    ): ResultMessage!
    chat_api_user_room_block(
      roomId: ObjectID!
      blockMemberSlugs: [String!]
    ): ResultMessage!
    chat_api_user_room_unblock(
      roomId:ObjectID!
      blockMemberSlug:String!
    ): ResultMessage!
    chat_api_user_room_role_set(
      roomId:ObjectID!
      memberSlug:String!
      roleSet:MemberRole!
    ):ResultMessage!
    # Message
    chat_api_user_message_send(
      roomType:TargetRoomType!
      receiver:String
      message:MessageInput!
    ): ResultMessage!

    chat_api_user_message_delete(
      roomId: ObjectID!
      messageId: ObjectID!
    ): ResultMessage!

    # Friend
    chat_api_user_friend_request_send(receiverSlug:String!):ResultMessage!
    chat_api_user_friend_request_accept(senderSlug:String!):ResultMessage!
    chat_api_user_friend_request_reject(senderSlug:String!):ResultMessage!
    chat_api_user_friend_block(senderSlug:String!):ResultMessage!
    chat_api_user_friend_unblock(senderSlug:String!):ResultMessage!

    #System
    chat_api_system_publish_news(data:MessData!):ResultMessage!
  }

  type Subscription {
    chat_api_user_subs_room(roomType:RoomType!,roomId: String!): SubMessage
    chat_api_user_subs_inbox_room(receiverSlug:String!):SubMessage
    chat_api_user_list_inbox:[Message]
  }
`;
