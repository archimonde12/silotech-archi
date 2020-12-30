import { decode } from "jsonwebtoken";

var PROTO_PATH = __dirname + "/account-service.proto";

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

var account_service_proto = grpc.loadPackageDefinition(packageDefinition)
  .AccountService;
console.log({ account_service_proto });
var target = "192.168.1.250:7001";
var client = new account_service_proto.BrickService(
  target,
  grpc.credentials.createInsecure()
);
console.dir({ client: client.Call.requestType });

const clientVerifyAuth = () => {
  return new Promise<any>((resolve, reject) => {
    let decoded = decode(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiaG9hbjAwMSIsInR5cGUiOiJzbHVnIiwiZXhwIjoxNjEwNDQ1NzYxLCJpYXQiOjE2MDkxNDk3NjF9.leQK5fCB8_0zw8IL8v7pJQPY9mTvPX4uXX3Mj4FDE2U",
      { complete: true }
    );

    let request = {
      method: "user_verify_auth_token",
      params: `{\"token\":\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiaG9hbjAwMSIsInR5cGUiOiJzbHVnIiwiZXhwIjoxNjEwNDQ1NzYxLCJpYXQiOjE2MDkxNDk3NjF9.leQK5fCB8_0zw8IL8v7pJQPY9mTvPX4uXX3Mj4FDE2U\"}`,
    };
    console.log({ request });
    client.Call(request, (error, response) => {
      console.log({ error });
      if (error) return reject();
      resolve(response);
    });
  });
};

export async function clientMain() {
  try {
    let response = await clientVerifyAuth();
    console.log({ response });
  } catch (err) {
    console.log({ err });
  }
}

clientMain();
