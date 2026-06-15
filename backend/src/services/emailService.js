// =========================================================================
// EMAIL SERVICE (SMTP & Simulation)
// Purpose: Delivers customer receipts via SMTP (if configured in .env)
//          or logs mock HTML emails to the backend terminal (if in dev mode).
// Used in: backend/src/controllers/orderController.js
// =========================================================================

const nodemailer = require('nodemailer');

const sendReceiptEmail = async (order, recipientEmail) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'receipts@cafe.pos';

  // Build the receipt HTML content
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.quantity}x</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product?.name || 'Item'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.total).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #8B4513;">Odoo Cafe POS</h2>
        <p style="margin: 5px 0; color: #666;">Thank you for your purchase!</p>
      </div>
      
      <div style="margin-bottom: 15px; font-size: 14px; color: #333;">
        <div><strong>Receipt Number:</strong> ${order.orderNumber}</div>
        <div><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
        <div><strong>Table:</strong> ${order.table?.tableNumber || 'Takeaway'}</div>
        <div><strong>Cashier:</strong> ${order.employee?.name || 'Staff'}</div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Qty</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="border-top: 2px solid #ddd; padding-top: 10px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal:</span>
          <strong>$${parseFloat(order.subtotal).toFixed(2)}</strong>
        </div>
        ${parseFloat(order.discountAmount) > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: green;">
          <span>Discount:</span>
          <strong>-$${parseFloat(order.discountAmount).toFixed(2)}</strong>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Tax:</span>
          <strong>$${parseFloat(order.tax).toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 5px; font-size: 16px; font-weight: bold; color: #8B4513;">
          <span>Total Paid:</span>
          <strong>$${parseFloat(order.total).toFixed(2)}</strong>
        </div>
      </div>
      
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999; border-top: 1px dashed #eee; padding-top: 15px;">
        Odoo Cafe POS Terminal &copy; 2026. All rights reserved.
      </div>
    </div>
  `;

  if (smtpHost && smtpUser && smtpPass) {
    // Scenario A: SMTP credentials are provided, send actual email!
    console.log(`[Email Service] Sending real receipt email to ${recipientEmail} via SMTP...`);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: smtpFrom,
      to: recipientEmail,
      subject: `Your Odoo Cafe POS Receipt - ${order.orderNumber}`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Real receipt email sent successfully to ${recipientEmail}!`);
    return { success: true, mode: 'smtp' };
  } else {
    // Scenario B: SMTP not configured, simulate email sending and log to server console
    console.log(`\n========================================================`);
    console.log(`📧 [EMAIL RECEIPT SIMULATOR] (No SMTP credentials configured in .env)`);
    console.log(`========================================================`);
    console.log(`To: ${recipientEmail}`);
    console.log(`From: ${smtpFrom}`);
    console.log(`Subject: Your Odoo Cafe POS Receipt - ${order.orderNumber}`);
    console.log(`--------------------------------------------------------`);
    console.log(`Receipt Details:`);
    console.log(`  Order: ${order.orderNumber}`);
    console.log(`  Table: ${order.table?.tableNumber || 'Takeaway'}`);
    console.log(`  Total: $${parseFloat(order.total).toFixed(2)}`);
    console.log(`  Items:`);
    order.items.forEach(item => {
      console.log(`    - ${item.quantity}x ${item.product?.name || 'Item'} ($${parseFloat(item.total).toFixed(2)})`);
    });
    console.log(`========================================================\n`);
    
    return { success: true, mode: 'simulated' };
  }
};

module.exports = {
  sendReceiptEmail
};
