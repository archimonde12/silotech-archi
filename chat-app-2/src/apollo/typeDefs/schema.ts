import { gql } from "apollo-server";

export const typeDefs = gql`
  scalar ObjectID
  scalar Date

  enum RoomType {
    global
    public
  }

  enum MessageType {
    plaintext
    bet
  }

  union Result = Room | Message | Member
  union MessageData = PlainTextMessData | BetMessData

  input MessData {
    title: String
    betId: String
    content: String
  }

  type User {
    slug: String
    createdAt: Date
  }

  type Room {
    _id: ObjectID!
    createdBy: User
    title: String
    type: String
    totalMembers: Int
    createdAt: Date
    updatedAt: Date
    lastMess: String
  }

  type Member {
    slug: String
    roomId: ObjectID
    joinedAt: Date
    role: String
  }

  type Message {
    roomId: ObjectID
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

  type Query {
    # Message
    get_messages(slug: String, roomId: ObjectID!, limit: Int): [Message]
    # Room
    get_room_details(roomId: ObjectID!): Room
    get_all_rooms(slug: String!): [Room]
    get_other_public_rooms(slug: String!): [Room]
    # Member
    get_all_members(roomId: ObjectID!): [Member]
  }

  type Mutation {
    # Room
    room_create(
      slug: String!
      title: String!
      startMemberSlugs: [String]!
      roomType: RoomType
    ): ResultMessage!
    inbox_create(senderSlug: String!, reciverSlug: String!): Room!
    room_delete(createrSlug: String!, roomId: ObjectID!): ResultMessage!
    room_join(newMemberSlug: String!, roomId: ObjectID!): ResultMessage!
    room_leave(memberSlug: String!, roomId: ObjectID!): ResultMessage!
    room_add(
      master: String!
      roomId: ObjectID!
      addMemberSlugs: [String]!
    ): ResultMessage!
    room_remove(
      master: String!
      roomId: ObjectID!
      removeMemberSlugs: [String!]
    ): ResultMessage!
    room_block(
      master: String!
      roomId: ObjectID!
      blockMembersSlugs: [String!]
    ): ResultMessage!
    # Message
    message_send(
      sender: String!
      roomId: ObjectID!
      type: MessageType
      data: MessData
    ): ResultMessage!

    message_delete(
      master: String!
      roomId: ObjectID!
      messageId: ObjectID!
    ): ResultMessage!
  }

  type Subscription {
    room_listen(roomId: ObjectID!): Message
  }
`;
