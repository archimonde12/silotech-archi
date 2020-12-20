import { Users } from "./user";
export let chatRooms = (() => {
  let start = 2;
  let data = [
    {
      id: 1,
      createBy: Users[1],
    },
  ];
  let addRoom = (slug) => {
    const newData = {
      id: start,
      createBy: Users.find((value) => value.slug === slug)!,
    };
    if (newData.createBy != undefined) {
      data.push(newData);
    }
    start++;
    return newData;
  };
  return {
    data,
    addRoom,
  };
})();
