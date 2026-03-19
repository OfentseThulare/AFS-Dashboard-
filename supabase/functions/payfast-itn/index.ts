import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayFast valid IP ranges for ITN callbacks
const PAYFAST_VALID_IPS = [
  // Production
  ...Array.from({ length: 14 }, (_, i) => `197.97.145.${145 + i}`),
  ...Array.from({ length: 30 }, (_, i) => `41.74.179.${193 + i}`),
  // Sandbox
  "144.126.193.139",
];

const EXPECTED_AMOUNT = 3000.0;
const MERCHANT_ID = "33250683";

/**
 * Generate MD5 hash (Deno built-in)
 */
async function md5(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build parameter string from PayFast data (excluding 'signature')
 * Spaces encoded as '+' per PayFast specification
 */
function buildParamString(data: Record<string, string>): string {
  const params: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === "signature") continue;
    if (value !== "") {
      params.push(
        `${key}=${encodeURIComponent(value).replace(/%20/g, "+")}`
      );
    }
  }
  return params.join("&");
}

/**
 * Validate signature from PayFast ITN data
 */
async function validateSignature(
  data: Record<string, string>,
  passphrase?: string
): Promise<boolean> {
  let paramString = buildParamString(data);
  if (passphrase) {
    paramString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  }
  const expectedSig = await md5(paramString);
  return expectedSig === data.signature;
}

/**
 * Confirm transaction data with PayFast server
 */
async function confirmWithPayFast(
  paramString: string,
  sandbox: boolean
): Promise<boolean> {
  const host = sandbox
    ? "sandbox.payfast.co.za"
    : "www.payfast.co.za";
  const url = `https://${host}/eng/query/validate`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: paramString,
  });

  const text = await response.text();
  return text.trim() === "VALID";
}

/**
 * Main ITN handler
 */
Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ── Step 1: Check source IP ──
    const sourceIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!PAYFAST_VALID_IPS.includes(sourceIp)) {
      console.warn(`ITN rejected: invalid source IP ${sourceIp}`);
      // Don't hard-reject — edge proxies may mask IPs. Log and continue.
    }

    // ── Step 2: Parse form data ──
    const formData = await req.formData();
    const data: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value as string;
    }

    // ── Step 3: Validate signature ──
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || undefined;
    const sigValid = await validateSignature(data, passphrase);
    if (!sigValid) {
      console.error("ITN rejected: invalid signature");
      return new Response("Invalid signature", { status: 400 });
    }

    // ── Step 4: Confirm with PayFast server ──
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    const paramString = buildParamString(data);
    const pfValid = await confirmWithPayFast(paramString, sandbox);
    if (!pfValid) {
      console.error("ITN rejected: PayFast server validation failed");
      return new Response("Validation failed", { status: 400 });
    }

    // ── Step 5: Verify merchant ID ──
    const expectedMerchantId =
      Deno.env.get("PAYFAST_MERCHANT_ID") || MERCHANT_ID;
    if (data.merchant_id !== expectedMerchantId) {
      console.error(
        `ITN rejected: merchant_id mismatch (got ${data.merchant_id})`
      );
      return new Response("Merchant ID mismatch", { status: 400 });
    }

    // ── Step 6: Verify payment amount ──
    const amountGross = parseFloat(data.amount_gross || "0");
    if (Math.abs(amountGross - EXPECTED_AMOUNT) > 0.01) {
      console.error(
        `ITN rejected: amount mismatch (got ${amountGross}, expected ${EXPECTED_AMOUNT})`
      );
      return new Response("Amount mismatch", { status: 400 });
    }

    // ── Step 7: Process payment status ──
    if (data.payment_status === "COMPLETE") {
      // Extract the payment reference (m_payment_id = team record ID)
      const teamId = data.m_payment_id;
      if (!teamId) {
        console.error("ITN: missing m_payment_id");
        return new Response("Missing payment ID", { status: 400 });
      }

      // Update team status in database using service role key
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error } = await supabase
        .from("afs_teams")
        .update({
          status: "Confirmed",
          pf_payment_id: data.pf_payment_id,
        })
        .eq("id", teamId);

      if (error) {
        console.error("ITN: database update failed", error.message);
        return new Response("DB update failed", { status: 500 });
      }

      console.log(
        `Payment confirmed for team ${teamId} (PF: ${data.pf_payment_id})`
      );
    } else {
      console.log(
        `ITN received with status: ${data.payment_status} for ${data.m_payment_id}`
      );
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("ITN processing error:", (err as Error).message);
    return new Response("Server Error", { status: 500 });
  }
});
