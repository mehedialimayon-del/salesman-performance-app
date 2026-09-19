/* FULL MONTHLY EXCEL EXPORT MODULE
   Final scope: excludes Activity Log, Proposals, Tasks & Assignments.
   This starter emits Excel-compatible CSV files per report area.
   XLSX workbook generation will be connected in the backend/export phase.
*/
window.FFHExport = {
  allowedSheets: [
    "Executive Summary","SR Performance","Daily Sales","Delivered Sales",
    "Outlet Wise","SKU Wise","Targets & Shortfall","Income Breakdown",
    "Sales Commission","Product Incentives","Other Incentives","Zero Sales",
    "CPO Execution","DPO Execution","Route & Visits"
  ],
  csv(filename, rows){
    const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
    const text=rows.map(r=>r.map(esc).join(",")).join("\\n");
    const blob=new Blob(["\\ufeff"+text],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
};