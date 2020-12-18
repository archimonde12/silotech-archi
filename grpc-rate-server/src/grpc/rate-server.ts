var PROTO_PATH = __dirname + "../../../src/protos/rate.proto";

var axios = require('axios')
var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
const { throws } = require('assert');
import {connectRedis} from "../redis"
import {routineUpdateNewRate} from "../saveNewRate"
import {getRate} from "../getRate"

var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
var rate_proto = grpc.loadPackageDefinition(packageDefinition).rateTrxUsdt;

// async function searchRate() {
//   try {
//     let rate;
//     const url = 'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd'
//     let data = await axios.get(url)
//     rate = data.data.tron.usd
//     return rate
//   } catch (err) { throw err } 
// }

async function GetRate(_, callback) {
  try {
    let rateValue:any = await getRate(20);
    console.log(rateValue)
    callback(null, { rate: rateValue.rate })
  }
  catch (err) {
    callback(err, { rate: null })
  }
}

function serverMain() {
  connectRedis()
  routineUpdateNewRate()
  var server = new grpc.Server();
  server.addService(rate_proto.RateTRX.service, { GetRate: GetRate });
  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
      server.start();
    }
  );
}

serverMain();
