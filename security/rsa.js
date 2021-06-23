var crypto = require("crypto");

var PRIVKEY =
  "-----BEGIN RSA PRIVATE KEY-----\n" +
  "MIIEowIBAAKCAQEAuErwCGWyq3nIASTKhgiHGAaURZ9rs5EBR9L1YUJh1ftYgQSt\n" +
  "0gUzab6hyW/upgM4Z4Mu6pA+KZCHncKc4SHJXdJvYnj1L6/RRinXQp+R3MmGypoB\n" +
  "/r1ckM1aEt75/I0m7Dlatj58f56Z21yHsJNbtf1LAD981a3kR6kaIb7Uc5bsUDwO\n" +
  "bF2r5xAenQDtaZoWgaErHWwiqzJJQebcAVVqlq2/+f1kzRVqHsasosXOD6hrDz9o\n" +
  "C2SvBKWVrmOPF4D+mwwaChEKAhFDvCKj5NYwprmoOXWK6t5WroYvsVo5Sa039DiC\n" +
  "PXMsug9MidhQLB7SpW7Bi+xeuwvObWppgGZ8FQIDAQABAoIBAQCPOcYkcI0UETgs\n" +
  "E2DGHBiJxoszNLuqOVaKcFw9sy5/87ALzQwdvecAFqR7/d617KjIYb5zk5iMCwQq\n" +
  "ylXL7csmfGYOXL0Iy5ZT9i6SW5srwP9ds6U7SgWHj+Ch6+LSsQx/5+8k1ZlCQYuH\n" +
  "XPkjdNKAtJK2ZaDqHBPe0YA6m6lXDrEOJl6xrlUWCZS02XPIXFaB+qTBG2UqWCUK\n" +
  "KzVa9qIqWf3bVGJCLc70u5UiuvCC+V8VtJ964AEnj90qZy1tRhEc2X8bbWmhL3yB\n" +
  "3SLWH4ZvJyEDQe/yycx9rO6CymDj3c378IyWORYt1y6mKRmltr2NJ1Ecbl9xaFrc\n" +
  "JeVO8wDdAoGBAOUjZzuaVppccEIiBbLS0NksSeD4tfjlUPFqVU1obZcbkDugK1Id\n" +
  "og+W5yVy2NqgeEi4nQ9Ogi485cWbCzTZM52d9zuFe/60hBFPU8jWxafW0OW2o6ci\n" +
  "F1vtzWEF2EO7omUoiGu6mOI4yRcUMwXiw1cCWr2NYpASQ39QuxwXKgg7AoGBAM3l\n" +
  "sC7nxqDusq+J9CI6V+oNb2v7KgapQmrdXNB5l6Mk2Dl/uNfuX5cDceMQlO5B/ObT\n" +
  "44kgsBR3tO6y7PQLDClt5ZPrVJZ16+cCj41UDDgZDD0vDaU24K/qSVrsOH4gNgeM\n" +
  "CcsInzX/l1bm+RAhE0pHuPHBZFuLi8brV/wZCpfvAoGAQu4XbmKDn20W4UpczcIk\n" +
  "fPshzVP4m24oOYwsxIKXWEcV10TOwpqjRth2RgsI6rtqxxsdzWXKQsVI/HJwUIyN\n" +
  "NiH5IGq6MEj8Nq4sNAMAEyl9NUwm+1/K4PBSSF/Trt0070Vqq8UCeTnLCzG8QaDe\n" +
  "HCE07h9JRfn/u0WSkf72KRcCgYAUTGmjJix53y50idgsq63RIEP01E0fXP50RKCK\n" +
  "2QHvDonWmVXiy9hWrftDVHYqSw0gwJD1CujxC6AlzDP6F0C6sN/qRlAPiU6ZdrIq\n" +
  "T7foq+d9/K6OtCtQjHtw4ErtfEV3VwH8Jzxy+WC1K44wXeJl904vX06Ci+5azQbe\n" +
  "jqVxtwKBgBnxVKFQCmuDjOZrf7V0jB/mf4ir9npqvHdJMHE/Et70lOaUbhat6i+Y\n" +
  "PPtJewynfF4zp+HD6jOlj4RhbCncMNdaWAyDYOucYOJOpMr5mIYJHdCOVQ0aSRD7\n" +
  "/dZEOGblrch6VXOEvC++yaToNhjkeTP63IH4K6uqa9btelz3Df5Y\n" +
  "-----END RSA PRIVATE KEY-----\n";

var PUBKEY =
  "-----BEGIN RSA PUBLIC KEY-----\n" +
  "MIIBCgKCAQEAuErwCGWyq3nIASTKhgiHGAaURZ9rs5EBR9L1YUJh1ftYgQSt0gUz\n" +
  "ab6hyW/upgM4Z4Mu6pA+KZCHncKc4SHJXdJvYnj1L6/RRinXQp+R3MmGypoB/r1c\n" +
  "kM1aEt75/I0m7Dlatj58f56Z21yHsJNbtf1LAD981a3kR6kaIb7Uc5bsUDwObF2r\n" +
  "5xAenQDtaZoWgaErHWwiqzJJQebcAVVqlq2/+f1kzRVqHsasosXOD6hrDz9oC2Sv\n" +
  "BKWVrmOPF4D+mwwaChEKAhFDvCKj5NYwprmoOXWK6t5WroYvsVo5Sa039DiCPXMs\n" +
  "ug9MidhQLB7SpW7Bi+xeuwvObWppgGZ8FQIDAQAB\n" +
  "-----END RSA PUBLIC KEY-----\n";

// RSA PRIVATE ENCRYPT -> PUBLIC DECRYPT //
myMSG = "[ORIGINAL] I'm securekim !!!";

function privENC_pubDEC(originMSG) {
  encmsg = crypto
    .privateEncrypt(PRIVKEY, Buffer.from(originMSG, "utf8"))
    .toString("base64");
  msg = crypto.publicDecrypt(PUBKEY, Buffer.from(encmsg, "base64"));
  console.log("Encrypted with private key : " + encmsg);
  console.log(msg.toString());
}

function pubENC_privDEC(originMSG) {
  encmsg = crypto
    .publicEncrypt(PUBKEY, Buffer.from(originMSG, "utf8"))
    .toString("base64");
  msg = crypto.privateDecrypt(PRIVKEY, Buffer.from(encmsg, "base64"));
  console.log("\n[OAEP] Encrypted with public key : " + encmsg);
  console.log(msg.toString());
}

privENC_pubDEC(myMSG); // RSA-OAEP 적용 안됨
pubENC_privDEC(myMSG); // RSA-OAEP 적용 됨
