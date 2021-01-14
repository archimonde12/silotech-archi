import { initApollo } from "./apollo"
import { BOT_TOKEN } from "./config";
const Slimbot = require('slimbot');

const slimbot = new Slimbot(BOT_TOKEN);

slimbot.on('message', message => {
  slimbot.sendMessage(message.chat.id, 'Message received');
});


function start(){
  initApollo()
  slimbot.startPolling();
}

start()
