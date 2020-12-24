import { IndexSpecification, ObjectID } from "mongodb";

type BlockMember = {
  slug: string;
  roomId: ObjectID;
};

type BlockMemberInMongo = {
  _id: ObjectID;
  slug: string;
  roomId: ObjectID;
};

const BlockMemberIndexes: IndexSpecification[] = [
  { key: { roomId: 1, slug: 1 } },
];

export { BlockMember, BlockMemberInMongo, BlockMemberIndexes };
