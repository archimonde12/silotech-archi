var PROTO_PATH = __dirname + "../../../src/protos/rate.proto";

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");

var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
var rate_proto = grpc.loadPackageDefinition(packageDefinition).rateTrxUsdt;

async function clientMain() {
  var target = "localhost:50051";
  var client = new rate_proto.RateTRX(target, grpc.credentials.createInsecure());

  const clientGetRate = () => {
    return new Promise<any>((resolve, reject) => {
      client.GetRate(null, (error, response) => {
        if (error) return reject()
        resolve(response)
      });
    })
  }

  try {
    let response = await clientGetRate()
    console.log(response.rate)
  } catch (err) {
    console.log(err)
  }
}

clientMain();
