import { MemberRole } from "../models/Member";
import { collectionNames, db } from "../mongo";

const memberRole = [
    {
        id: MemberRole.admin.id,
        name: MemberRole.admin.name
    },
    {
        id: MemberRole.master.id,
        name: MemberRole.master.name
    },
    {
        id: MemberRole.member.id,
        name: MemberRole.member.name
    },
]

export const createMemberRoleToMongo = async () => {
    let checkMemberRolesDataExistInMongo = await db.collection(collectionNames.memberRoles).findOne({ id: memberRole[0].id })
    console.log({ checkMemberRolesDataExistInMongo: checkMemberRolesDataExistInMongo ? true : false })
    if (!checkMemberRolesDataExistInMongo) {
        let addUsersDataRes = await db.collection(collectionNames.memberRoles).insertMany(memberRole)
        console.log("Try to add member role data")
        console.log({ addUsersDataRes })
        return console.log("Update member role data");

    }
    return console.log("member role data already created")
}