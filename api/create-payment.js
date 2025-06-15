export default function handler(req, res) {
  const crypto = require("crypto");

  const HashKey = "5294y06JbISpM5x9";
  const HashIV = "v77hoKGq4kWxNNIS";
  const MerchantID = "2000132";

  const tradeNo = "TEST" + Date.now();
  const tradeDate = new Date().toLocaleString('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
}).replace(/\//g, '/');
const amount = parseInt(req.query.amount, 10) || 1000;
const itemName = req.query.itemName || "VIP方案";
const rawParams = {
  MerchantID,
  MerchantTradeNo: tradeNo,
  MerchantTradeDate: tradeDate,
  PaymentType: "aio",
  TotalAmount: amount.toString(),
  TradeDesc: "VIP購買",
  ItemName: itemName,
  ReturnURL: "https://ecpay-1f26tagv7-laijas-projects.vercel.app/api/payment-return",
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
