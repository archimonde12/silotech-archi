var PROTO_PATH = __dirname + "/account-service.proto";

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");

var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

var account_service_proto = grpc.loadPackageDefinition(packageDefinition).AccountService;
var target = "192.168.1.250:7001";
var client = new account_service_proto.BrickService(
    target,
    grpc.credentials.createInsecure()
);

const clientGetRate = () => {
    return new Promise<any>((resolve, reject) => {
        let params = {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzbHVnIjoiaG9hbjAwMSIsInR5cGUiOiJzbHVnIiwiZXhwIjoxNjEwNDQ1NzYxLCJpYXQiOjE2MDkxNDk3NjF9.leQK5fCB8_0zw8IL8v7pJQPY9mTvPX4uXX3Mj4FDE2U",
        }
        client.Call({
            method: "user_verify_auth_token",
            params: JSON.stringify(params)
        }, (error, response) => {
            console.log({error})
            if (error) return reject()
            resolve(response)
            return response
        });
    })
}

async function clientMain() {
    try {
        let response = await clientGetRate()
        console.log({response})
    } catch (err) {
        console.log({err})
    }
}

clientMain();
