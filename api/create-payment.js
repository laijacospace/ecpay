const crypto = require("crypto");

export default function handler(req, res) {
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

  // ✅ 從前端取得參數
  const amount = parseInt(req.query.amount, 10) || 299;
  const itemName = req.query.itemName || "一般VIP方案";
  const email = req.query.email || "";
  const invoiceType = req.query.invoiceType || "";
  const carrier = req.query.carrier || "";
  const companyTaxId = req.query.companyTaxId || "";

  const rawParams = {
    MerchantID,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: "aio",
    TotalAmount: amount.toString(),
    TradeDesc: "VIP購買",
    ItemName: itemName,
    ReturnURL: "https://ecpay.vercel.app/api/payment-return", // 待你新增
    ChoosePayment: "Credit",
    EncryptType: "1",

    // ✅ 傳給付款成功回傳的備用欄位（會傳給 payment-return）
    CustomField1: email,
    CustomField2: invoiceType,
    CustomField3: carrier,
    CustomField4: companyTaxId
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
