import fetch from "node-fetch";

// Base API
const MAILTM_API = "https://api.mail.tm";

// Create mailbox (account) and login to get a token
export async function createTestInbox() {
  const email = `${Math.random().toString(36).substring(2)}@mail.tm`;
  const password = Math.random().toString(36);

  // Create account
  await fetch(`${MAILTM_API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });

  // Login to get token
  const tokenResponse = await fetch(`${MAILTM_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });

  const { token } = (await tokenResponse.json()) as { token: string };

  return { email, password, token };
}

// Get messages for inbox
export async function getMessages(token: string) {
  const res = await fetch(`${MAILTM_API}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { "hydra:member": unknown[] };
  return data["hydra:member"] ?? [];
}

// Wait for email (polling)
export async function waitForEmail(
  token: string,
  timeout = 30000,
  interval = 2000
) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const messages = await getMessages(token);
    if (messages.length > 0) return messages[0]; // return latest email

    await new Promise((res) => setTimeout(res, interval));
  }

  throw new Error("Timeout: No email received");
}
