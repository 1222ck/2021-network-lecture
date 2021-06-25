var express = require("express"),
  http = require("http");
app = express();
bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const config = require("./config/config.json");
const database = require("./mongodb.js");
const { v4: uuidv4 } = require("uuid");

const BIDFEE = config.bidFee;
const ASKFEE = config.askFee;
const MARKETS = config.markets;

let _MARKETS_STATUS = {};
let _LOCAL_ALL_ACCOUNTS;
let _LOCAL_ALL_USERSAUTH;
let _CHANGED_ACCESSKEY = {};

setInterval(async () => {
  for (var _access_key in _CHANGED_ACCESSKEY) {
    if (_CHANGED_ACCESSKEY[_access_key]) {
      try {
        await database.saveAccount(
          _access_key,
          _LOCAL_ALL_ACCOUNTS[_access_key].accounts
        );
        _CHANGED_ACCESSKEY[_access_key] = false;
      } catch (E) {
        console.log(E);
      }
    }
  }
}, 10000);

async function init() {
  for (var i in MARKETS) {
    _MARKETS_STATUS[MARKETS[i]] = {
      ask_price: "",
      ask_volume: "",
      bid_price: "",
      bid_volume: "",
      realTimeStamp: "",
      bid_power: "",
      ask_power: "",
    };
  }
  await database.init();
  _LOCAL_ALL_ACCOUNTS = database.getSavedAccounts();
  /*
{
  TEST_ACCESSKEY3: {
    _id: "TEST_ACCESSKEY3",
    accessKey: "TEST_ACCESSKEY3",
    accounts: [
      {
        currency: "ETH",
        balance: "2",
        avg_buy_price: "0",
        unit_currency: "KRW",
        timestamp: "6/25/2021, 3:26:39 AM",
      },
    ],
  },
  TEST_ACCESSKEY1: {
    _id: "TEST_ACCESSKEY1",
    accessKey: "TEST_ACCESSKEY1",
    accounts: [
      {
        currency: "ETH",
        balance: "2",
        avg_buy_price: "0",
        unit_currency: "KRW",
        timestamp: "6/25/2021, 3:29:57 AM",
      },
    ],
  },
}
   */
  _LOCAL_ALL_USERSAUTH = database.getSavedUserAuth();
  /*
{
  TEST_ACCESSKEY3: "fGT0g89y6xclPkQNYALqg8ucra+SmT+oaW+EwxWjPXvUcChIXLqDBU0PcdR0ygXKRyWTm3eI4cOUoxtLNcYBIw==",
  TEST_ACCESSKEY1: "5PsKOnR6EEr1jH6kLh45KXdHAWI8EfaKGrrU0NuOZdU=",
}
   */
  for (var _access_key in _LOCAL_ALL_USERSAUTH) {
    _CHANGED_ACCESSKEY[_access_key] = false;
  }
  orderbookWS(MARKETS);
}

var server = http.createServer(app);
server.listen(80); //1024 이하의 포트는 특정 cap 권한이 필요합니다.
//web 폴더 밑에 있는 파일들을 요청이 있을때 접근 가능하도록 합니다.
app.use(express.static(__dirname + "/web"));
app.use(bodyParser.json());

//////////////////////////////////// UPBIT API ////////////////

//{"access_key":"MYACCESS_KEY","nonce":"6d90e663-6efb-4123-bcb2-436e386ff66e","iat":1623767
//잘못된 경우 : 401 Unauthorized
////"{\"error\":{\"message\":\"잘못된 엑세스 키입니다.\",\"name\":\"invalid_access_key\"}}"
app.get("/v1/accounts", (req, res) => {
  let retJSON = verifyJWT(req);
  let access_key = retJSON.accessKey;
  console.log("[Server] /v1/accounts : " + access_key);
  if (retJSON.result) {
    res.statusCode = 200;
    res.send(_LOCAL_ALL_ACCOUNTS[access_key].accounts);
  } else {
    res.statusCode = 401;
    message = "잘못된 엑세스 키입니다.";
    database.saveErrorLog(access_key, message);
    res.send({ error: { message: message, name: "invalid_access_key" } });
  }
});

app.post("/v1/orders", (req, res) => {
  let retJSON = verifyJWT(req);
  console.log("[Server] /v1/accounts : " + retJSON.accessKey);
  if (retJSON.result) {
    ret = order(req, retJSON.accessKey);
    if (ret.result) {
      res.send(ret.message);
    } else {
      res.statusCode = 400;
      res.send({ error: { message: ret.message, name: "virtualUpbitServer" } });
    }
  } else {
    res.statusCode = 401;
    message = "잘못된 엑세스 키입니다.";
    database.saveErrorLog(access_key, message);
    res.send({ error: { message: message, name: "invalid_access_key" } });
  }
});

function order(req, access_Key) {
  try {
    let market = req.body.market;
    let ord_type = req.body.ord_type;
    let price = parseFloat(req.body.price);
    let side = req.body.side;
    let volume = parseFloat(req.body.volume);
    if (!marketValidation(market))
      return { result: false, message: "Fail : marketValidation : " + market };
    if (!valueCheck([price, volume]))
      return { result: false, message: "Fail : price/volume Value Check" };
    return sellOrBuy(market, side, ord_type, price, volume, access_Key);
  } catch (E) {
    console.log(E);
    return { result: false, message: "Fail : Internal Server Error" };
  }
}

function valueCheck(arr) {
  for (var i in arr) {
    if (arr[i] <= 0) return false;
  }
  return true;
}

function marketValidation(market) {
  for (var i in MARKETS) {
    if (MARKETS[i] == market) return true;
  }
  return false;
}

//구매 가격 단위로 나누어 떨어지지 않으면 못 산다.
//여기서 price는 호가이다.
//구매할때만 참고하면 됨.
function getTradeUnitKRW(price) {
  if (price < 10) return 0.01;
  if (price < 100) return 0.1;
  if (price < 1000) return 1;
  if (price < 10000) return 5;
  if (price < 100000) return 10;
  if (price < 500000) return 50;
  if (price < 1000000) return 100;
  if (price < 2000000) return 500;
  return 1000;
}
//
function getBalanceAfterBuy(price, access_key) {
  //구매 후 밸런스(남은 돈) 계산.
  let balance = 0;
  let accounts = _LOCAL_ALL_ACCOUNTS[access_key].accounts;
  for (var i in accounts) {
    if (accounts[i].currency == "KRW") {
      balance = accounts[i].balance;
      break;
    }
  }
  return parseFloat(balance) - price; // 산만큼 빼자. 0보다 작으면 에러.
}

function getVolumeAfterBuy(market, price) {
  //price 만큼 사고나면 얼마의 volume을 얻게 되는지.
  //살 수 있는 가격은 판매되고 있는 가격이다.
  ask_price = _MARKETS_STATUS[market].ask_price; // 1볼륨당 가격.
  tradeUnit = getTradeUnitKRW(ask_price);
  if (price % tradeUnit != 0) {
    return 0; //가격 단위 안 맞음.
  }
  volume = parseFloat(price) / parseFloat(ask_price);
  return volume;
}

function getPriceAfterSell(market, volume) {
  //volume 만큼 팔고 나면 얼마의 KRW을 얻게 되는지.
  //팔 수 있는 가격은 구매되고 있는 가격이다.
  bid_price = _MARKETS_STATUS[market].bid_price;
  //가격이 개당 1000원이고 내가 5개 팔려고한다?
  price = parseFloat(bid_price) * parseFloat(volume);

  return price;
}

function sellOrBuy(market, side, ord_type, price, volume, access_key) {
  if (side == "bid" && ord_type == "price") {
    //balance : 내가 사고나면 남는 돈.
    balance = getBalanceAfterBuy(price, access_key);
    //사고나면 생기는 볼륨
    volume = getVolumeAfterBuy(market, price);
    if (volume <= 0) {
      console.log(
        "[" + market + "][BUY][" + access_key + "] 가격 단위 안 맞음 : " + price
      );
      return { result: false, message: "Fail : Error price unit : " + price };
    }
    return buy(market, volume, price, balance, access_key);
  } else if (side == "ask" && ord_type == "market") {
    //price : volume 만큼 팔고나면 생기는 KRW
    price = getPriceAfterSell(market, volume, access_key);
    if (price <= 0) {
      console.log(
        "[" + market + "][SELL][" + access_key + "] PRICE ERROR : " + price
      );
    }
    return sell(market, volume, price, access_key);
    //sell
    //아직 수수료 계산 안함. 해당 볼륨만큼의 현재 가격을 가져와서 해야됨
  } else {
    console.log(
      "[" +
        market +
        "][?][" +
        access_key +
        "] ERROR side: " +
        side +
        " ord_type : " +
        ord_type
    );
    //구매도 아니고 판매도 아님
    return { result: false, message: "Fail : Error side/ord_type" };
  }
}

function buy(market, volume, price, balance, access_key) {
  //access_key가 market에서 price만큼 사서 volume 만큼 생겼다.
  //수수료 계산 필요. 만약 수수료 포함해서 계정에 돈이 모자라면 안산다.
  volume = parseFloat(volume);
  price = parseFloat(price);
  let ask_price = parseFloat(_MARKETS_STATUS[market].ask_price); // 가격 고정 (변동 가능)
  try {
    fee = price * BIDFEE;
    if (balance - fee < 0) {
      console.log(
        "[" +
          market +
          "][FEE][" +
          access_key +
          "] Not enough balance : " +
          balance +
          " / Fee : " +
          fee
      );
      return { result: false, message: "Fail : Not enough balance" };
    }
    //돈 충분, 이제 구매하자
    //마켓의 Volume은 증가하고, KRW의 돈은 감소한다.

    let accounts = _LOCAL_ALL_ACCOUNTS[access_key].accounts;
    for (var i in accounts) {
      if ("KRW-" + accounts[i].currency == market) {
        // 해당 마켓 찾음. 구매해서 볼륨 생김.
        //기존의 가격, 볼륨과 사는 가격, 볼륨의 평균
        accounts[i].avg_buy_price = getAvgPrice(
          parseFloat(accounts[i].avg_buy_price),
          parseFloat(accounts[i].balance),
          ask_price,
          volume
        );
        //샀으니까 볼륨 수정
        accounts[i].balance = parseFloat(accounts[i].balance) + volume;
      }
      if (accounts[i].currency == "KRW") {
        accounts[i].balance = parseFloat(accounts[i].balance) - price - fee; // price 만큼 샀으니 KRW 없애고, 수수료도 빼줌.
      }
    }
  } catch (E) {
    console.log("ERROR : " + access_key);
    console.log(E);
    return { result: false, message: "Fail : Internal Server Error : BUY" };
  }
  message = {
    uuid: uuidv4(),
    side: "bid",
    ord_type: "price", //시장가 매수
    price: ask_price, //주문당시 화폐가격
    avg_price: ask_price, //체결 가격의 평균가격
    state: "done", //주문 상태
    market: market,
    created_at: new Date().toLocaleString("en", { timeZone: "Asia/Seoul" }),
    volume: volume, //매수해서 얼마나 생겼냐(사용자가 입력한 것)
    remaining_volume: "0.0", //무조건 다 사짐
    reserved_fee: "0.0", //수수료 다 써짐
    remaining_fee: "0.0",
    paid_fee: fee.toString(),
    locked: "0.0",
    executed_volume: volume, //매수해서 얼마나 생겼냐(실제 집행된 것)
    trades_count: 1, // 한번에 무조건 다 사진다
  };
  _CHANGED_ACCESSKEY[access_key] = true; // 변경사항 존재
  database.saveOrderLog(access_key, message);
  return { result: true, message: message };
}

//기존의 가격, 볼륨과 사는 가격, 볼륨의 평균
function getAvgPrice(avgPrice1, volume1, avgPrice2, volume2) {
  return (avgPrice1 * volume1 + avgPrice2 * volume2) / (volume1 + volume2);
}

function sell(market, volume, price, access_key) {
  let bid_price;
  price = parseFloat(price);
  volume = parseFloat(volume);
  try {
    bid_price = price / volume; // 마켓의 개당 판매 가격
    fee = price * ASKFEE;
    //판매하자. 마켓의 Volume은 감소하고, KRW돈은 증가한다.
    let accounts = _LOCAL_ALL_ACCOUNTS[access_key].accounts;
    for (var i in accounts) {
      if ("KRW-" + accounts[i].currency == market) {
        // 해당 마켓 찾음. 판매해서 볼륨 사라짐.
        //평균 가격은 변하지 않는다.
        //팔았으니까 볼륨 감소
        let balance = parseFloat(accounts[i].balance) - volume;
        if (balance < 0)
          return { result: false, message: "Fail : Not Enough Volume : SELL" };
        accounts[i].balance = balance;
      }
      if (accounts[i].currency == "KRW") {
        accounts[i].balance = parseFloat(accounts[i].balance) + price - fee; // price 만큼 팔았으니 KRW 더해주고, 수수료는 빼줌.
      }
    }
  } catch (E) {
    console.log("ERROR : " + access_key);
    console.log(E);
    return { result: false, message: "Fail : Internal Server Error : SELL" };
  }
  message = {
    uuid: uuidv4(),
    side: "ask",
    ord_type: "market", //시장가 매도
    price: bid_price, //주문당시 화폐가격
    avg_price: bid_price, //체결 가격의 평균가격
    state: "done", //주문 상태
    market: market,
    created_at: new Date().toLocaleString("en", { timeZone: "Asia/Seoul" }),
    volume: volume, //매도해서 얼마나 생겼냐(사용자가 입력한 것)
    remaining_volume: "0.0", //무조건 다 팔림
    reserved_fee: "0.0", //수수료 다 써짐
    remaining_fee: "0.0",
    paid_fee: fee.toString(), //사용된 수수료
    locked: "0.0",
    executed_volume: volume, //매도해서 얼마나 생겼냐(실제 집행된 것)
    trades_count: 1, // 한번에 무조건 다 사진다
  };

  _CHANGED_ACCESSKEY[access_key] = true; // 변경사항 존재
  database.saveOrderLog(access_key, message);
  return { result: true, message: message };
}

//return : {result : true/false, accessKey}
function verifyJWT(req) {
  let accessKey = "";
  let retJSON = { result: true, accessKey: accessKey };
  try {
    token = req.headers.authorization.split(" ")[1];
    info = token.split(".")[1];
    body = Buffer.from(info, "base64").toString("utf8");
    jsonBody = JSON.parse(body);
    secretKey = _LOCAL_ALL_USERSAUTH[jsonBody.access_key]; // TODO
    jwt.verify(token, secretKey, (err, verifiedJwt) => {
      if (err) {
        retJSON.result = false;
      } else {
        accessKey = verifiedJwt.access_key;
        retJSON.result = true;
        retJSON.accessKey = accessKey;
      }
    });
  } catch (E) {
    retJSON.result = false;
    console.log(E);
  }
  return retJSON;
}

//////////////WEBSOCKET////////////

const WebSocket = require("ws");
function orderbookWS(markets) {
  ticket = uuidv4();
  var ws = new WebSocket("wss://api.upbit.com/websocket/v1");
  ws.on("open", () => {
    ws.send(
      '[{"ticket":"' +
        ticket +
        '"},{"type":"orderbook","codes":["' +
        markets.join('","') +
        '"]},{"format":"SIMPLE"}]'
    );
  });
  ws.on("close", () => {
    setTimeout(function () {
      orderbookWS(markets);
    }, 1000);
  });
  ws.on("message", (data) => {
    try {
      var str = data.toString("utf-8");
      var json = JSON.parse(str);
      market = json.cd;
      market_state = json.market_state;
      _MARKETS_STATUS[market].ask_price = json.obu[0].ap;
      _MARKETS_STATUS[market].ask_volume = json.obu[0].as;
      _MARKETS_STATUS[market].bid_price = json.obu[0].bp;
      _MARKETS_STATUS[market].bid_volume = json.obu[0].bs;
      timeStamp = new Date(json.tms).toLocaleString();
      _MARKETS_STATUS[market].realTimeStamp = timeStamp;
    } catch (e) {
      //console.log(e)
    }
  });
}

init();

console.log("sever on");
