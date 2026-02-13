import fetch from "node-fetch";
import crypto from "crypto";

const MAILTM_API = "https://api.mail.tm";

async function assertOk(res: any, context: string) {
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  throw new Error(
    `${context} failed: HTTP ${res.status} ${res.statusText}\n${text}`
  );
}

function randStr(len: number) {
  // URL-safe, predictable length
  return crypto.randomBytes(Math.ceil((len * 3) / 4)).toString("base64url").slice(0, len);
}

async function getActiveDomain(): Promise<string> {
  const res = await fetch(`${MAILTM_API}/domains?page=1`);
  await assertOk(res, "GET /domains");
  const data = (await res.json()) as any;

  const domains = (data["hydra:member"] ?? [])
    .filter((d: any) => d.isActive && !d.isPrivate)
    .map((d: any) => d.domain);

  if (!domains.length) throw new Error("No active public domains returned by Mail.tm");
  return domains[0]; // or pick random
}

export async function createTestInbox() {
  const domain = await getActiveDomain();

  // local part: keep it safely long (avoid 422 "not long enough")
  const local = randStr(12).toLowerCase();
  const email = `${local}@${domain}`;

  // password: make it clearly long enough
  const password = `P@${randStr(14)}!`; // e.g. 17+ chars

  // Create account
  const createRes = await fetch(`${MAILTM_API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });
  await assertOk(createRes, "POST /accounts");

  // Login to get token
  const tokenRes = await fetch(`${MAILTM_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });
  await assertOk(tokenRes, "POST /token");

  const { token, id } = (await tokenRes.json()) as { token: string; id: string };

  return { email, password, token, accountId: id };
}

export async function getMessages(token: string) {
  const res = await fetch(`${MAILTM_API}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await assertOk(res, "GET /messages");

  const data = (await res.json()) as { "hydra:member": unknown[] };
  return data["hydra:member"] ?? [];
}

export async function waitForEmail(token: string, timeout = 30000, interval = 2000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const messages = await getMessages(token);
    if (messages.length > 0) return messages[0];
    await new Promise((res) => setTimeout(res, interval));
  }

  throw new Error("Timeout: No email received");
}
