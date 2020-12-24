import { IndexSpecification, ObjectID } from "mongodb";

const MessageTypes={
  plaintext:{
    id:'0',
    name:'plaintext'
  },

}

type Message = {
  roomId: ObjectID;
  sentAt: Date;
  type: string,
  data: object,
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

export { Message, MessageInMongo, MessageIndexes,MessageTypes };
