import crypto from "node:crypto";

const SECRET = () => process.env.TOKEN_SECRET || "change-me-in-netlify-env";

export function sign(payload){
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig  = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  return body + "." + sig;
}

export function verify(token){
  if(!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", SECRET()).update(body).digest("base64url");
  if(sig.length !== expect.length) return null;
  if(!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try{
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if(!p.exp || Date.now() > p.exp) return null;
    return p;
  }catch(e){ return null; }
}

export function bearer(req){
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function session(req){ return verify(bearer(req)); }

export function requireAdmin(req){
  const s = session(req);
  return (s && s.role === "prowesstics") ? s : null;
}

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {status, headers:{"content-type":"application/json"}});

export const recKey = (email) => "rec/" + String(email).trim().toLowerCase();

export function nameFromEmail(email){
  const local = String(email).split("@")[0] || "";
  return local.split(/[._-]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || email;
}
