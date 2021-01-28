import { decode } from "jsonwebtoken";

var PROTO_PATH = __dirname + "/proto/account-service.proto";

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
var jwt = require("jsonwebtoken");

var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

var account_service_proto = grpc.loadPackageDefinition(packageDefinition);
var target = "192.168.1.250:7001";
var client = new account_service_proto.BrickService(
  target,
  grpc.credentials.createInsecure()
);

const AccountService = (method: string, params: any) => {
  return new Promise<any>((resolve, reject) => {
    const request = { method, params: JSON.stringify(params) };
    //console.log(request)
    client.Call(request, (error, response) => {
      if (error) {
        console.log(error)
        return reject()
      }
      resolve(response);
    });
  });
};

export async function VerifyToken(token) {
  try {
    let response = await AccountService("user_verify_auth_token", { token });
    if (!response) throw new Error("CA:002");
    //console.log(response)
    console.log(`This is token of user: ${response.result}`)
    return response;
  } catch (err) {
    console.log(`token invalid!`);
  }
}

export async function Test() {
  try {
    let response = await AccountService("sdasdas", {});
  } catch (err) {
    console.log(err)
  }
}