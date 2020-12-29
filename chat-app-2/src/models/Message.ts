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
  }
}

type Message = {
  roomKey: string;
  sentAt: Date;
  type: string,
  data: object,
  createdBy: User;
};

type MessageInMongo = {
  _id: ObjectID;
  roomKey: string;
  sentAt: Date;
  type: string,
  data: object,
  createdBy: User;
};

const MessageIndexes: IndexSpecification[] = [
  { key: { roomId: 1, createdBy: 1 } },
];

export { Message, MessageInMongo, MessageIndexes, MessageTypes };
