import path from "path";
import { initApollo } from "./apollo"
import { BOT_TOKEN } from "./config";
var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '../index.html'));
})

app.listen(8501)
const Slimbot = require('slimbot');

const slimbot = new Slimbot(BOT_TOKEN);

slimbot.on('message', message => {
  console.log(message)
  slimbot.sendMessage(message.chat.id, 'Message received');
});



function start() {
  initApollo()
  slimbot.startPolling();
}

start()
