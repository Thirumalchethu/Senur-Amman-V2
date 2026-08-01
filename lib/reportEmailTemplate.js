const fmtINR = (n) => {
  const num = Number(n || 0);
  const formatted = "₹" + Math.abs(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return num < 0 ? "-" + formatted : formatted;
};

const fmtPct = (n) => (n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`);

function categoryRows(list, color) {
  if (list.length === 0) {
    return `<tr><td style="padding:6px 0;color:#5B4B3E;font-size:13px;">No entries this month</td></tr>`;
  }
  return list
    .map(
      ([name, amt]) => `
      <tr>
        <td style="padding:6px 0;color:#241712;font-size:14px;">${name}</td>
        <td style="padding:6px 0;color:${color};font-size:14px;text-align:right;font-weight:600;">${fmtINR(amt)}</td>
      </tr>`
    )
    .join("");
}

export function buildReportEmailHtml({ templeName, tagline, report, siteUrl, unsubscribeUrl }) {
  const { monthLabel, deposits, withdrawals, net, monthChange, yearChange, availableBalance, depositCategories, withdrawalCategories } = report;

  return `
  <div style="background:#F6EEDA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FFFDF7;border-radius:16px;overflow:hidden;border:1px solid #D8C9A3;">
      <div style="background:linear-gradient(180deg,#4E141C,#6E1F2A);padding:28px 24px;text-align:center;color:#F6EEDA;">
        <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#D9AD52;">Monthly Contribution Summary</div>
        <div style="font-size:24px;font-weight:700;margin-top:6px;">${templeName}</div>
        <div style="font-size:13px;color:#F6EEDACC;margin-top:2px;">${tagline || ""}</div>
        <div style="font-size:15px;margin-top:14px;color:#D9AD52;">${monthLabel}</div>
      </div>

      <div style="padding:24px;">
        <div style="text-align:center;background:#F6EEDA;border-radius:12px;padding:18px;margin-bottom:20px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5B4B3E;">Funds Currently Available</div>
          <div style="font-size:30px;font-weight:700;color:#6E1F2A;margin-top:4px;">${fmtINR(availableBalance)}</div>
        </div>

        <table width="100%" style="margin-bottom:20px;">
          <tr>
            <td style="width:50%;text-align:center;padding:8px;">
              <div style="font-size:11px;color:#5B4B3E;text-transform:uppercase;">Deposited</div>
              <div style="font-size:18px;font-weight:700;color:#204A3B;">${fmtINR(deposits)}</div>
            </td>
            <td style="width:50%;text-align:center;padding:8px;">
              <div style="font-size:11px;color:#5B4B3E;text-transform:uppercase;">Withdrawn</div>
              <div style="font-size:18px;font-weight:700;color:#8A2C2C;">${fmtINR(withdrawals)}</div>
            </td>
          </tr>
        </table>

        <div style="text-align:center;font-size:13px;color:#5B4B3E;margin-bottom:20px;">
          Net this month: <b style="color:#241712;">${fmtINR(net)}</b>
          &nbsp;·&nbsp; vs last month: <b>${fmtPct(monthChange)}</b>
          &nbsp;·&nbsp; vs last year: <b>${fmtPct(yearChange)}</b>
        </div>

        <div style="margin-bottom:18px;">
          <div style="font-size:14px;font-weight:700;color:#6E1F2A;margin-bottom:6px;">Deposits by category</div>
          <table width="100%" style="border-collapse:collapse;">${categoryRows(depositCategories, "#204A3B")}</table>
        </div>

        <div>
          <div style="font-size:14px;font-weight:700;color:#6E1F2A;margin-bottom:6px;">Withdrawals by category</div>
          <table width="100%" style="border-collapse:collapse;">${categoryRows(withdrawalCategories, "#8A2C2C")}</table>
        </div>

        ${siteUrl ? `<div style="text-align:center;margin-top:24px;"><a href="${siteUrl}/donate" style="display:inline-block;background:#204A3B;color:#F6EEDA;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">Contribute again 🙏</a></div>` : ""}
      </div>

      <div style="padding:14px 24px;text-align:center;font-size:11px;color:#5B4B3E;border-top:1px solid #D8C9A3;">
        You're receiving this because you opted in to updates from ${templeName}.
        ${unsubscribeUrl ? `<a href="${unsubscribeUrl}" style="color:#5B4B3E;">Unsubscribe</a>` : ""}
      </div>
    </div>
  </div>`;
}
