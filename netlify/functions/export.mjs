import { getStore } from "@netlify/blobs";
import { requireAdmin, json } from "../lib/auth.mjs";
import * as XLSX from "xlsx";

const store = () => getStore({name:"requirement", consistency:"strong"});
const sheetName = (s) => String(s).replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 28) || "Sheet";

export default async (req) => {
  if(!requireAdmin(req)) return json({error:"Not permitted"}, 403);

  const url  = new URL(req.url);
  const only = (url.searchParams.get("email") || "").toLowerCase();

  const {blobs} = await store().list({prefix:"rec/"});
  const records = [];
  for(const b of blobs){
    const r = await store().get(b.key, {type:"json"});
    if(r && (!only || String(r.email).toLowerCase() === only)) records.push(r);
  }
  if(!records.length) return json({error:"No responses recorded yet"}, 404);
  records.sort((a,b)=> String(a.name||"").localeCompare(String(b.name||"")));

  const wb = XLSX.utils.book_new();

  const summary = [["Respondent","Email","Questions answered","Submitted","Status","Last updated"]];
  records.forEach(r=>{
    const rows = r.rows || [];
    const answered = rows.filter(x => x.a && x.a !== "Not answered").length;
    summary.push([
      r.name || "",
      r.email || "",
      answered + " of " + rows.length,
      r.meta && r.meta.submittedAt ? new Date(r.meta.submittedAt).toLocaleString("en-GB") : "Not submitted",
      r.meta && r.meta.locked ? "Locked" : "Open",
      r.updatedAt ? new Date(r.updatedAt).toLocaleString("en-GB") : ""
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1["!cols"] = [{wch:24},{wch:34},{wch:20},{wch:22},{wch:12},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws1, "Summary");

  const all = [["Respondent","Email","Section","Question","Answer"]];
  records.forEach(r=>{
    (r.rows||[]).forEach(x=> all.push([r.name||"", r.email||"", x.section, x.q, x.a]));
  });
  const ws2 = XLSX.utils.aoa_to_sheet(all);
  ws2["!cols"] = [{wch:22},{wch:32},{wch:34},{wch:66},{wch:70}];
  ws2["!autofilter"] = {ref: XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:all.length-1, c:4}})};
  XLSX.utils.book_append_sheet(wb, ws2, "All responses");

  records.forEach((r, i)=>{
    const rows = [["Section","Question","Answer"]];
    (r.rows||[]).forEach(x=> rows.push([x.section, x.q, x.a]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{wch:34},{wch:66},{wch:70}];
    XLSX.utils.book_append_sheet(wb, ws, sheetName((r.name || ("Person " + (i+1)))));
  });

  const buf = XLSX.write(wb, {type:"buffer", bookType:"xlsx"});
  const stamp = new Date().toISOString().slice(0,10);
  const fname = only
    ? "requirement-" + only.split("@")[0].replace(/[^a-z0-9]+/g,"-") + "-" + stamp + ".xlsx"
    : "requirement-all-responses-" + stamp + ".xlsx";

  return new Response(buf, {status:200, headers:{
    "content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition":'attachment; filename="' + fname + '"'
  }});
};
