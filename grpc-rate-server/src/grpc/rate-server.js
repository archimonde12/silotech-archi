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

function GetRate(call) {
  let result = "Hello World";
  console.log(result, call.request.id);
  return { rate: result };
}

function main() {
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

main();
