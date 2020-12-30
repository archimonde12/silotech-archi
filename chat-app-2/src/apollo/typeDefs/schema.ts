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
    get_messages_in_room(sender: String, reciver: String!, limit: Int, skip:Int): [Message]
    # Room
    get_room_details(roomId: ObjectID!): Room
    get_all_rooms: [Room]
    get_inbox_rooms(slug: String!, limit: Int, skip:Int):[InboxRoom]
    # Member
    get_all_members(roomId: ObjectID!): [Member]
    # Friend
    get_all_friends(slug:String!):[User]
  }

  type Mutation {
    # Room
    room_create(
      slug: String!
      title: String!
      startMemberSlugs: [String]!
      roomType: RoomType!
    ): ResultMessage!
    room_delete(createrSlug: String!, roomId: ObjectID!): ResultMessage!
    room_join(newMemberSlug: String!, roomId: ObjectID!): ResultMessage!
    room_leave(memberSlug: String!, roomId: ObjectID!): ResultMessage!
    room_add(
      admin: String!
      roomId: ObjectID!
      addMemberSlugs: [String]!
    ): ResultMessage!
    room_remove(
      admin: String!
      roomId: ObjectID!
      removeMemberSlugs: [String!]
    ): ResultMessage!
    room_block(
      admin: String!
      roomId: ObjectID!
      blockMembersSlugs: [String!]
    ): ResultMessage!
    room_remove_block(
      admin:String!
      roomId:ObjectID!
      blockMemberSlug:String!
    ): ResultMessage!
    room_set_role(
      master:String!
      roomId:ObjectID!
      memberSlug:String!
      roleSet:MemberRole
    ):Member
    # Message
    message_send(
      sender: String!
      reciver: String!
      type: MessageType
      data: MessData
    ): ResultMessage!

    message_delete(
      admin: String!
      roomId: ObjectID!
      messageId: ObjectID!
    ): ResultMessage!

    # Friend
    friend_send_request(senderSlug:String!,reciverSlug:String!):ResultMessage!
    friend_accept_request(reciverSlug:String!,senderSlug:String!):ResultMessage!
    friend_reject_request(reciverSlug:String!,senderSlug:String!):ResultMessage!
    friend_block(reciverSlug:String!,senderSlug:String!):ResultMessage!
    friend_block_remove(reciverSlug:String!,senderSlug:String!):ResultMessage!
  }

  type Subscription {
    room_listen(roomKey: String!): SubMessage
  }
`;
