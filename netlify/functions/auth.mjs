import { sign, json, nameFromEmail } from "../lib/auth.mjs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DAY = 24 * 60 * 60 * 1000;

export default async (req) => {
  if(req.method !== "POST") return json({error:"Method not allowed"}, 405);

  let body;
  try{ body = await req.json(); }catch(e){ return json({error:"Bad request"}, 400); }

  const email = String(body.email || "").trim().toLowerCase();
  const pin   = String(body.pin || "").trim();

  if(!EMAIL_RE.test(email)) return json({error:"Enter a valid email address"}, 400);

  const accessPin = process.env.ACCESS_PIN || "4274";
  const adminPin  = process.env.ADMIN_PIN  || "";

  let role = null;
  if(adminPin && pin === adminPin) role = "prowesstics";
  else if(pin === accessPin) role = "client";

  if(!role) return json({error:"That code is not recognised"}, 401);

  const name = String(body.name || "").trim() || nameFromEmail(email);
  const token = sign({email, role, name, exp: Date.now() + 30 * DAY});

  return json({token, email, role, name});
};
