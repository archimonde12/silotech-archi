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

function main() {
  var target = "localhost:50051";
  var client = new rate_proto.RateTRX(
    target,
    grpc.credentials.createInsecure()
  );
  client.GetRate({ id: "tron" });
}

main();
