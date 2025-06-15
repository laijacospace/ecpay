import { parse } from 'querystring';
import getRawBody from 'raw-body';
import crypto from 'crypto';

export const config = {
  api: {
    bodyParser: false, // 禁用 Next.js 預設解析
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    // ✅ 1. 解析綠界回傳資料
    const raw = await getRawBody(req);
    const body = parse(raw.toString());
    console.log("🧾 綠界付款回傳資料：", body);

    if (body.RtnCode !== "1") {
      console.log("❌ 交易未成功，跳過發票開立");
      return res.status(200).send("未成功付款");
    }

    // ✅ 2. 準備開立發票用參數
    const MerchantID = "2000132";
    const HashKey = "5294y06JbISpM5x9";
    const HashIV = "v77hoKGq4kWxNNIS";
    const API_URL = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";

    const RelateNumber = "INV" + Date.now(); // 發票號碼
    const TotalAmount = body.TradeAmt || "0";
    const ItemName = body.ItemName || "VIP方案";
    const Email = body.CustomField1 || "";
    const InvoiceType = body.CustomField2 || "personal";
    const CarrierNum = body.CustomField3 || "";
    const CompanyTaxId = body.CustomField4 || "";

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

    if (InvoiceType === "mobile") {
      invoiceParams.CarrierType = "3J0002";
      invoiceParams.CarrierNum = CarrierNum;
    } else if (InvoiceType === "company") {
      invoiceParams.CustomerIdentifier = CompanyTaxId;
      invoiceParams.CustomerName = "公司用戶";
    } else {
      invoiceParams.CarrierType = "1"; // 綠界載具
    }

    // ✅ 3. 加密發票資料
    const json = JSON.stringify(invoiceParams);
    const base64 = Buffer.from(json).toString("base64");

    const rawStr = `HashKey=${HashKey}&PostData=${base64}&HashIV=${HashIV}`;
    const urlencoded = encodeURIComponent(rawStr).toLowerCase()
      .replace(/%20/g, '+')
      .replace(/%21/g, '!')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%2a/g, '*');

    const CheckMacValue = crypto.createHash("sha256").update(urlencoded).digest("hex").toUpperCase();

    // ✅ 4. 發送發票 API 請求
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

    return res.status(200).send("發票開立完成");
  } catch (err) {
    console.error("❌ 發票開立失敗：", err);
    return res.status(500).send("處理失敗");
  }
}
