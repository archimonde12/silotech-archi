import { Users } from "./user";

export let message = (() => {
  let data = [
    {
      chatRoomId: 1,
      content: "Hello",
      owner: Users[1],
    },
  ];
  let addMessage = (chatRoomId, content, slug) => {
    let NewData = {
      chatRoomId,
      content,
      owner: Users.find((value) => value.slug === slug)!,
    };
    data.push(NewData);
    return NewData;
  };
  return {
    data,
    addMessage,
  };
})();
