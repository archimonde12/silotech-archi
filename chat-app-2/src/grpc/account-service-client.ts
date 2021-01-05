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

var account_service_proto = grpc.loadPackageDefinition(packageDefinition);
var target = "192.168.1.250:7001";
var client = new account_service_proto.BrickService(
  target,
  grpc.credentials.createInsecure()
);

const clientLogin = () => {
  return new Promise<any>((resolve, reject) => {
    let params = {
      username: "hoan001",
      password: "Hoan123",
    };
    let request = {
      method: "user_login",
      params: JSON.stringify(params),
    };
    console.log({ request });
    client.Call(request, (error, response) => {
      console.log({ error });
      if (error) return reject();
      resolve(response);
    });
  });
};

const AccountService = (method: string, params: any) => {
  return new Promise<any>((resolve, reject) => {
    const request = { method, params: JSON.stringify(params) };
    console.log({ request });
    client.Call(request, (error, response) => {
      if (error) return reject();
      resolve(response);
    });
  });
};

export async function clientMain() {
  try {
    let response = await clientLogin();
    console.log({ response });
  } catch (err) {
    console.log({ err });
  }
}

export async function VerifyToken(token) {
  try {
    let response = await AccountService("user_verify_auth_token", { token });
    console.log({ response });
    if (!response) throw new Error("token invalid!");
    return response;
  } catch (err) {
    console.log({ err });
  }
}
