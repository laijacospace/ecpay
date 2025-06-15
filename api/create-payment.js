export default function handler(req, res) {
  const crypto = require("crypto");

  const HashKey = "5294y06JbISpM5x9";
  const HashIV = "v77hoKGq4kWxNNIS";
  const MerchantID = "2000132";

  const tradeNo = "TEST" + Date.now();
  const tradeDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  const rawParams = {
    MerchantID,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: "aio",
    TotalAmount: "1000",
    TradeDesc: "測試訂單",
    ItemName: "測試商品一件",
    ReturnURL: "https://你的網域/api/payment-return",
    ChoosePayment: "Credit",
    EncryptType: "1",
  };

  const query = Object.entries(rawParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const raw = `HashKey=${HashKey}&${query}&HashIV=${HashIV}`;
  const encoded = encodeURIComponent(raw).toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*');

  const hash = crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();

  rawParams.CheckMacValue = hash;

  const formInputs = Object.entries(rawParams)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v}">`)
    .join("");

  const html = `
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5">
          ${formInputs}
        </form>
      </body>
    </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
