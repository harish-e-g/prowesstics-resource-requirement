import { getStore } from "@netlify/blobs";
import { session, requireAdmin, json, recKey } from "../lib/auth.mjs";

const store = () => getStore({name:"requirement", consistency:"strong"});

async function readRec(email){
  try{
    const r = await store().get(recKey(email), {type:"json"});
    return r || null;
  }catch(e){ return null; }
}

function blank(s){
  return {email:s.email, name:s.name, answers:{}, rows:[],
          meta:{log:[], createdAt:new Date().toISOString()}, updatedAt:null};
}

export default async (req) => {
  const s = session(req);
  if(!s) return json({error:"Not signed in"}, 401);

  const url   = new URL(req.url);
  const scope = url.searchParams.get("scope") || "me";

  if(req.method === "GET"){
    if(scope === "shared"){
      const shared = await store().get("shared", {type:"json"});
      return json(shared || {recommendations:{}, notes:{}});
    }
    if(scope === "all"){
      if(!requireAdmin(req)) return json({error:"Not permitted"}, 403);
      const {blobs} = await store().list({prefix:"rec/"});
      const out = [];
      for(const b of blobs){
        const r = await store().get(b.key, {type:"json"});
        if(r) out.push(r);
      }
      out.sort((a,b)=> String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
      return json({records: out});
    }
    if(scope === "one"){
      if(!requireAdmin(req)) return json({error:"Not permitted"}, 403);
      const email = url.searchParams.get("email") || "";
      const r = await readRec(email);
      return json(r || {error:"Not found"}, r ? 200 : 404);
    }
    const mine = await readRec(s.email);
    return json(mine || blank(s));
  }

  if(req.method === "PUT"){
    let body;
    try{ body = await req.json(); }catch(e){ return json({error:"Bad request"}, 400); }

    if(scope === "shared"){
      if(!requireAdmin(req)) return json({error:"Not permitted"}, 403);
      const payload = {recommendations: body.recommendations || {}, notes: body.notes || {},
                       updatedAt: new Date().toISOString()};
      await store().setJSON("shared", payload);
      return json({ok:true, updatedAt: payload.updatedAt});
    }

    const target = (s.role === "prowesstics" && body.email) ? String(body.email).toLowerCase() : s.email;
    const existing = await readRec(target);
    const rec = {
      email: target,
      name: body.name || (existing && existing.name) || s.name,
      answers: body.answers || {},
      rows: Array.isArray(body.rows) ? body.rows : [],
      meta: Object.assign({}, existing && existing.meta, body.meta || {}),
      updatedAt: new Date().toISOString()
    };
    await store().setJSON(recKey(target), rec);
    return json({ok:true, updatedAt: rec.updatedAt});
  }

  return json({error:"Method not allowed"}, 405);
};
