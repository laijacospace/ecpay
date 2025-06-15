export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const crypto = require("crypto");

  // 綠界測試發票參數
  const MerchantID = "2000132";
  const HashKey = "5294y06JbISpM5x9";
  const HashIV = "v77hoKGq4kWxNNIS";
  const API_URL = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";

  const body = req.body;

  // 只有交易成功才處理開立發票
  if (body.RtnCode !== "1") {
    return res.status(200).send("交易未成功，跳過發票開立");
  }

  // 取出資料
  const RelateNumber = "INV" + Date.now(); // 發票號碼
  const TotalAmount = body.TradeAmt || "0";
  const ItemName = body.ItemName || "VIP方案";
  const Email = body.CustomField1 || "";
  const InvoiceType = body.CustomField2 || "personal";
  const CarrierNum = body.CustomField3 || "";
  const CompanyTaxId = body.CustomField4 || "";

  // 組發票參數
  const invoiceParams = {
    MerchantID,
    RelateNumber,
    CustomerEmail: Email,
    Print: InvoiceType === "company" ? "1" : "0",
    Donation: "0",
    TaxType: "1",
    SalesAmount: TotalAmount,
    InvoiceItems: [
      {
        ItemName,
        ItemCount: "1",
        ItemWord: "項",
        ItemPrice: TotalAmount,
        ItemTaxType: "1"
      }
    ],
    InvType: "07",
    DelayDay: "0",
    Tsr: RelateNumber
  };

  // 發票載具類型
  if (InvoiceType === "mobile") {
    invoiceParams.CarrierType = "3J0002";
    invoiceParams.CarrierNum = CarrierNum;
  } else if (InvoiceType === "company") {
    invoiceParams.CustomerIdentifier = CompanyTaxId;
    invoiceParams.CustomerName = "公司用戶";
  } else {
    invoiceParams.CarrierType = "1"; // 綠界自動載具
  }

  // 加密資料
  const json = JSON.stringify(invoiceParams);
  const base64 = Buffer.from(json).toString("base64");

  const raw = `HashKey=${HashKey}&PostData=${base64}&HashIV=${HashIV}`;
  const urlencoded = encodeURIComponent(raw).toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*');

  const CheckMacValue = crypto.createHash("sha256").update(urlencoded).digest("hex").toUpperCase();

  // 發送 POST 請求
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        MerchantID,
        RqHeader: JSON.stringify({ Timestamp: Date.now(), Revision: "1.5.2" }),
        Data: base64,
        CheckMacValue
      })
    });

    const text = await response.text();
    console.log("✅ 發票開立結果：", text);
    return res.status(200).send("發票已處理");
  } catch (error) {
    console.error("❌ 發票開立失敗：", error);
    return res.status(500).send("發票失敗");
  }
}
