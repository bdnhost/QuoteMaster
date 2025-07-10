const puppeteer = require('puppeteer');

const generateQuotePDF = async (quote) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Calculate totals
    const subtotal = quote.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (quote.tax_rate / 100);
    const total = subtotal + taxAmount;
    
    // Format dates
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('he-IL');
    };
    
    // Generate HTML content for the PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הצעת מחיר ${quote.quote_number}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 20px;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
            }
            
            .business-info {
                flex: 1;
            }
            
            .business-name {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            
            .business-details {
                font-size: 14px;
                color: #666;
            }
            
            .quote-title {
                text-align: center;
                flex: 1;
            }
            
            .quote-title h1 {
                font-size: 28px;
                color: #2563eb;
                margin-bottom: 5px;
            }
            
            .quote-number {
                font-size: 18px;
                color: #666;
            }
            
            .quote-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            
            .customer-info, .quote-details {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .section-title {
                font-size: 16px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
            }
            
            .info-row {
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .info-label {
                font-weight: bold;
                color: #374151;
                display: inline-block;
                width: 80px;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
            }
            
            .items-table th {
                background: #2563eb;
                color: white;
                padding: 15px 10px;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
            }
            
            .items-table td {
                padding: 12px 10px;
                text-align: center;
                border-bottom: 1px solid #e2e8f0;
                font-size: 14px;
            }
            
            .items-table tr:last-child td {
                border-bottom: none;
            }
            
            .items-table tr:nth-child(even) {
                background: #f8fafc;
            }
            
            .description-cell {
                text-align: right !important;
                max-width: 300px;
                word-wrap: break-word;
            }
            
            .totals {
                margin-top: 30px;
                display: flex;
                justify-content: flex-end;
            }
            
            .totals-table {
                border-collapse: collapse;
                min-width: 300px;
            }
            
            .totals-table td {
                padding: 8px 15px;
                border: 1px solid #e2e8f0;
                font-size: 14px;
            }
            
            .totals-table .label {
                background: #f8fafc;
                font-weight: bold;
                text-align: right;
                color: #374151;
            }
            
            .totals-table .amount {
                text-align: left;
                font-weight: bold;
            }
            
            .total-row {
                background: #2563eb !important;
                color: white !important;
                font-size: 16px !important;
            }
            
            .notes {
                margin-top: 30px;
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            
            .notes-title {
                font-size: 16px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            
            .notes-content {
                font-size: 14px;
                line-height: 1.8;
                white-space: pre-line;
            }
            
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #e2e8f0;
                padding-top: 20px;
            }
            
            .currency {
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="business-info">
                <div class="business-name">${quote.business_name}</div>
                <div class="business-details">
                    <div>טלפון: ${quote.business_phone}</div>
                    <div>כתובת: ${quote.business_address}</div>
                </div>
            </div>
            <div class="quote-title">
                <h1>הצעת מחיר</h1>
                <div class="quote-number">#${quote.quote_number}</div>
            </div>
        </div>

        <div class="quote-info">
            <div class="customer-info">
                <div class="section-title">פרטי לקוח</div>
                <div class="info-row">
                    <span class="info-label">שם:</span>
                    ${quote.customer.name}
                </div>
                <div class="info-row">
                    <span class="info-label">אימייל:</span>
                    ${quote.customer.email}
                </div>
                <div class="info-row">
                    <span class="info-label">טלפון:</span>
                    ${quote.customer.phone}
                </div>
                <div class="info-row">
                    <span class="info-label">כתובת:</span>
                    ${quote.customer.address}
                </div>
            </div>
            
            <div class="quote-details">
                <div class="section-title">פרטי הצעה</div>
                <div class="info-row">
                    <span class="info-label">תאריך:</span>
                    ${formatDate(quote.issue_date)}
                </div>
                <div class="info-row">
                    <span class="info-label">תוקף עד:</span>
                    ${formatDate(quote.valid_until)}
                </div>
                <div class="info-row">
                    <span class="info-label">מע"מ:</span>
                    ${quote.tax_rate}%
                </div>
                <div class="info-row">
                    <span class="info-label">סטטוס:</span>
                    ${quote.status === 'draft' ? 'טיוטה' : 
                      quote.status === 'sent' ? 'נשלח' : 
                      quote.status === 'approved' ? 'אושר' : 'נדחה'}
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 10%">#</th>
                    <th style="width: 50%">תיאור</th>
                    <th style="width: 10%">כמות</th>
                    <th style="width: 15%">מחיר יחידה</th>
                    <th style="width: 15%">סה"כ</th>
                </tr>
            </thead>
            <tbody>
                ${quote.items.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="description-cell">${item.description}</td>
                        <td>${item.quantity}</td>
                        <td class="currency">₪${item.unitPrice.toLocaleString('he-IL')}</td>
                        <td class="currency">₪${(item.quantity * item.unitPrice).toLocaleString('he-IL')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td class="label">סכום ביניים:</td>
                    <td class="amount currency">₪${subtotal.toLocaleString('he-IL')}</td>
                </tr>
                <tr>
                    <td class="label">מע"מ (${quote.tax_rate}%):</td>
                    <td class="amount currency">₪${taxAmount.toLocaleString('he-IL')}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">סה"כ לתשלום:</td>
                    <td class="amount currency">₪${total.toLocaleString('he-IL')}</td>
                </tr>
            </table>
        </div>

        ${quote.notes ? `
        <div class="notes">
            <div class="notes-title">הערות</div>
            <div class="notes-content">${quote.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
            <div>הצעת מחיר זו נוצרה באמצעות QuoteMaster Pro</div>
            <div>תאריך יצירה: ${new Date().toLocaleDateString('he-IL')}</div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    return pdfBuffer;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = {
  generateQuotePDF
};
