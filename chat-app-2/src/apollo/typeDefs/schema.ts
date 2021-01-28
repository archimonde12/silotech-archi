import { gql } from "apollo-server";

export const typeDefs = gql`
  scalar ObjectID
  scalar Date

  enum RoomType {
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

  input Target{
    roomType:TargetRoomType!
    receiver:String
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
    test:String
    # Search users
    chat_search_users(text:String,limit:Int):[User]
    # Message
    chat_get_messages_in_room( room: Target!, pageSize:Int,page:Int): [Message]
    # Room
    chat_get_room_details(roomId: ObjectID!): Room
    chat_get_all_rooms(pageSize:Int,page:Int): [Room]
    chat_get_inbox_rooms( pageSize:Int,page:Int):[InboxRoom]
    chat_get_mix_rooms(pageSize:Int,page:Int):[MixRoom]
    # Member
    chat_get_all_members(roomId: ObjectID!,pageSize:Int,page:Int): [Member]
    # Friend
    chat_get_all_friends(pageSize:Int,page:Int):[User]
    chat_get_all_friend_requests(pageSize:Int,page:Int):[User]
  }

  type Mutation {
    # Room
    chat_room_create(
      title: String!
      startMemberSlugs: [String]!
      roomType: RoomType!
    ): ResultMessage!
    chat_room_delete( roomId: ObjectID!): ResultMessage!
    chat_room_join( roomId: ObjectID!): ResultMessage!
    chat_room_leave( roomId: ObjectID!): ResultMessage!
    chat_room_add(
      roomId: ObjectID!
      addMemberSlugs: [String]!
    ): ResultMessage!
    chat_room_remove(
      roomId: ObjectID!
      removeMemberSlugs: [String!]
    ): ResultMessage!
    chat_room_block(
      roomId: ObjectID!
      blockMemberSlugs: [String!]
    ): ResultMessage!
    chat_room_remove_block(
      roomId:ObjectID!
      blockMemberSlug:String!
    ): ResultMessage!
    chat_room_set_role(
      roomId:ObjectID!
      memberSlug:String!
      roleSet:MemberRole!
    ):ResultMessage!
    # Message
    chat_message_send(
      target: Target!
      message:MessageInput!
    ): ResultMessage!

    chat_message_delete(
      roomId: ObjectID!
      messageId: ObjectID!
    ): ResultMessage!

    # Friend
    chat_friend_send_request(receiverSlug:String!):ResultMessage!
    chat_friend_accept_request(senderSlug:String!):ResultMessage!
    chat_friend_reject_request(senderSlug:String!):ResultMessage!
    chat_friend_block(senderSlug:String!):ResultMessage!
    chat_friend_block_remove(senderSlug:String!):ResultMessage!

    #System
    chat_system_publish_news(data:MessData!):ResultMessage!
  }

  type Subscription {
    room_listen(roomType:RoomType!,roomId: String!): SubMessage
    inbox_room_listen(receiverSlug:String!):SubMessage
    userListInbox:[Message]
  }
`;
