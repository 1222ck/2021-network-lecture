var request = require("request");
const url = "http://127.0.0.1";

async function post(url) {
  return new Promise(function (resolve, reject) {
    request(
      {
        url: url,
        method: "POST",
        hearder: { "content-type": "application/json" },
        body: JSON.stringify({ Client: "hi" }),
      },
      function (err, res, resbody) {
        if (err) {
          reject(err);
        } else {
          console.log("POST: ", res.statusCode);
          resolve(resbody);
        }
      }
    );
  });
}

async function get(url) {
  return new Promise(function (resolve, reject) {
    request(url, function (err, res, resbody) {
      if (err) {
        rejext(err);
      } else {
        console.log("GET: ", res.statusCode);
      }
    });
  });
}

async function main() {
  ret = await get(url);
  console.log(ret);
  ret = await post(url);
  console.log(ret);
}

main();
