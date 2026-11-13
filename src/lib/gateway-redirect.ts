export type GatewayRedirect = { url: string; method: "GET" | "POST"; fields?: Record<string, string> };

/** Sends the browser to the payment gateway (plain link, or an auto-submitted form when the gateway wants a POST). */
export function goToGateway(r: GatewayRedirect): void {
  if (r.method === "GET" || !r.fields) {
    window.location.href = r.url;
    return;
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = r.url;
  for (const [k, v] of Object.entries(r.fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    form.appendChild(i);
  }
  document.body.appendChild(form);
  form.submit();
}

/** Plain-words message for the ?pay= result the return route puts in the URL. */
export function payResultMessage(code: string | null): { text: string; pending: boolean } | null {
  switch (code) {
    case "pending":
      return { text: "We are confirming your payment with Easypaisa. This page updates by itself, please do not pay again.", pending: true };
    case "failed":
      return { text: "The payment did not go through. You have not been charged. You can try again.", pending: false };
    case "cancelled":
      return { text: "You cancelled the payment. You have not been charged. Your work is saved, so you can continue when ready.", pending: false };
    case "expired":
      return { text: "The payment was not completed in time. If money left your account, it will be matched automatically or refunded.", pending: false };
    default:
      return null;
  }
}
