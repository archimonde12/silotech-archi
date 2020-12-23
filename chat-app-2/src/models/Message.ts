import { IndexSpecification, ObjectID } from "mongodb";

type Message = {
  roomId: ObjectID;
  sentAt: Date;
  content: string;
  createdBy: string;
};

type MessageInMongo = {
  _id: ObjectID;
  roomId: ObjectID;
  sentAt: Date;
  content: string;
  createdBy: string;
};

const MessageIndexes: IndexSpecification[] = [
  { key: { roomId: 1, sentAt: -1, createdBy: 1 } },
];

export { Message, MessageInMongo, MessageIndexes };
