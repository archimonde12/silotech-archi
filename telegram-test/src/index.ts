// const Slimbot = require('slimbot');
// const Slimbot=require('slimbot')
import Slimbot from 'slimbot'
import { BOT_TOKEN } from './config'

const initSlimbot = () => {
  const slimbot = new Slimbot(BOT_TOKEN);

  // Register listeners

  slimbot.on('message', message => {
    console.log(message.entities)
    slimbot.sendMessage(message.chat.id, 'Message received');
  });

  slimbot.on('callback_query',callbackQuery=>{
    console.log({callbackQuery})
  })

  // Call API

  slimbot.startPolling();
  console.log('polling ...')
}

const start=()=>{
  initSlimbot()
}

start()



