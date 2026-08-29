const XLSX = require('xlsx');
try {
  const workbook = XLSX.readFile('TENDER LIST_20260807.xlsx');
  const sheet_name_list = workbook.SheetNames;
  const first_sheet = workbook.Sheets[sheet_name_list[0]];
  const data = XLSX.utils.sheet_to_json(first_sheet, {header: 1});
  console.log("Sheet names:", sheet_name_list);
  console.log("First 10 rows:");
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) {
  console.error(e);
}
