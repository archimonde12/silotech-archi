import { IndexSpecification, ObjectID } from "mongodb";
import { User } from "./User";

const MessageTypes = {
  plaintext: {
    id: '0',
    name: 'plaintext'
  },
  shareContact: {
    id: '1',
    name: 'shareContact'
  },
  system: {
    id: '2',
    name: 'system'
  }
}

type MessageType = "plaintext" | "shareContact" | "system"

type PlainTextData = {
  content: string
}

type ShareContactData = {
  userData: User
  content: string
}

type DataType = PlainTextData | ShareContactData

type Message = {
  roomId: string;
  sentAt: Date;
  type: string,
  data: DataType,
  createdBy: User;
};

type MessageInMongo = {
  _id: ObjectID
  roomId: string;
  sentAt: Date;
  type: string,
  data: DataType,
  createdBy: User;
};


const MessageIndexes: IndexSpecification[] = [
  { key: { roomId: 1, createdBy: 1, sentAt: 1 }, unique: true },
];

export { Message, MessageInMongo, MessageIndexes, MessageTypes, MessageType, PlainTextData, ShareContactData };
