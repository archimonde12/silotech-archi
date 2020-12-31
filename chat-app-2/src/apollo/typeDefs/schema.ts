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
  }

  union Result = Room | Message | Member
  union MessageData = PlainTextMessData | BetMessData | ShareContactData
  union SubMessage = Message | DeleteNoti | SystemMessage

  input MessData {
    title: String
    betId: String
    content: String
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
    lastMess: MessageData
  }

  type InboxRoom{
    roomKey:String!
    pair:[User]!
    lastMess:Message
    blockRequest:[User]
    friendStatus:Boolean
  }

  type Member {
    slug: String
    roomId: ObjectID
    joinedAt: Date
    role: String
  }
  
  type SystemMessage{
    roomKey:String
    content:String
  }

  type DeleteNoti{
    roomId:ObjectID
    deleteMessageId:ObjectID!
    content:String
  }

  type Message {
    _id:ObjectID!
    roomKey: String
    sentAt: Date
    type: MessageType
    data: MessageData
    createdBy: User
  }

  type ResultMessage {
    success: Boolean!
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
    # Message
    get_messages_in_room(token: String, reciver: String!, limit: Int, skip:Int): [Message]
    # Room
    get_room_details(roomId: ObjectID!): Room
    get_all_rooms: [Room]
    get_inbox_rooms(token: String!, limit: Int, skip:Int):[InboxRoom]
    # Member
    get_all_members(roomId: ObjectID!): [Member]
    # Friend
    get_all_friends(token:String!,limit:Int,skip:Int):[User]
    get_all_friend_requests(token:String!,limit:Int,skip:Int):[User]
  }

  type Mutation {
    # Room
    room_create(
      token: String!
      title: String!
      startMemberSlugs: [String]!
      roomType: RoomType!
    ): ResultMessage!
    room_delete(token: String!, roomId: ObjectID!): ResultMessage!
    room_join(token: String!, roomId: ObjectID!): ResultMessage!
    room_leave(token: String!, roomId: ObjectID!): ResultMessage!
    room_add(
      token: String!
      roomId: ObjectID!
      addMemberSlugs: [String]!
    ): ResultMessage!
    room_remove(
      token: String!
      roomId: ObjectID!
      removeMemberSlugs: [String!]
    ): ResultMessage!
    room_block(
      token: String!
      roomId: ObjectID!
      blockMembersSlugs: [String!]
    ): ResultMessage!
    room_remove_block(
      token:String!
      roomId:ObjectID!
      blockMemberSlug:String!
    ): ResultMessage!
    room_set_role(
      token:String!
      roomId:ObjectID!
      memberSlug:String!
      roleSet:MemberRole
    ):Member
    # Message
    message_send(
      token: String!
      reciver: String!
      type: MessageType
      data: MessData
    ): ResultMessage!

    message_delete(
      token: String!
      roomId: ObjectID!
      messageId: ObjectID!
    ): ResultMessage!

    # Friend
    friend_send_request(token:String!,reciverSlug:String!):ResultMessage!
    friend_accept_request(token:String!,senderSlug:String!):ResultMessage!
    friend_reject_request(token:String!,senderSlug:String!):ResultMessage!
    friend_block(token:String!,senderSlug:String!):ResultMessage!
    friend_block_remove(token:String!,senderSlug:String!):ResultMessage!
  }

  type Subscription {
    room_listen(roomKey: String!): SubMessage
  }
`;
