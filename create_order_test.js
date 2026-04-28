import * as XLSX from 'xlsx';
import * as fs from 'fs';

// 1. 데이터 베이스용 시트 (Sheet1)
const data = [
  { "품명": "SEARCH-TEST-PN", "가격": 999000, "업체": "테스트업체" }
];

// 2. 주문서 시트 (ORDER)
const orderData = [];
const workbook = XLSX.utils.book_new();

const worksheet1 = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet1, "Sheet1");

const worksheetOrder = XLSX.utils.aoa_to_sheet([
  // H1에 값을 넣기 위해 8번째 열(H)까지 빈 값 채우기
  ["", "", "", "", "", "", "", "SEARCH-TEST-PN"] 
]);
XLSX.utils.book_append_sheet(workbook, worksheetOrder, "ORDER");

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('C:\\Users\\jimmy\\order_test.xlsx', buffer);

console.log('Order test file created: order_test.xlsx at C:\\Users\\jimmy\\');
