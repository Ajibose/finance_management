export function emailTemplate(invoice: any, customer: any) {
  const paidAt = new Date(invoice.paidAt).toLocaleString();

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#222;">
      <h2 style="color:#007bff;">Invoice Paid Confirmation</h2>
      <p>Hello${customer.name ? ` <strong>${customer.name}</strong>` : ""},</p>
      <p>
        We’ve received your payment for <strong>Invoice ${invoice.number}</strong>.
      </p>
      <table style="border-collapse:collapse;margin-top:10px;">
        <tr>
          <td style="padding:6px 12px;">Amount Paid:</td>
          <td style="padding:6px 12px;"><strong>${invoice.total} ${invoice.currency}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 12px;">Paid At:</td>
          <td style="padding:6px 12px;">${paidAt}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;">Status:</td>
          <td style="padding:6px 12px;"><span style="color:green;font-weight:bold;">PAID</span></td>
        </tr>
      </table>
      <p>Thank you for your prompt payment.</p>
      <p style="margin-top:20px;font-size:13px;color:#666;">
        — The Finance Team
      </p>
    </div>
  `;
}
