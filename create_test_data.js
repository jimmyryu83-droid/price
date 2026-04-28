import * as XLSX from 'xlsx';
import * as fs from 'fs';

const data = [
  { "품명": "CPU-I7-12700K", "가격": 450000, "업체": "인텔아이엔씨" },
  { "품명": "GPU-RTX-3080", "가격": 1200000, "업체": "앤비디아코리아" },
  { "품명": "RAM-DDR5-16GB", "가격": 85000, "업체": "삼성전자" },
  { "품명": "SSD-NVME-1TB", "가격": 150000, "업체": "SK하이닉스" },
  { "품명": "CPU-I7-12700K", "가격": 445000, "업체": "컴퓨존" } // 최신 가격 테스트용 중복 PN
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Prices");

const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('c:\\Users\\jimmy\\Downloads\\아주대\\데이터분석프로그래밍\\코딩\\Price_check\\test_data.xlsx', buffer);

console.log('Test Excel file created: test_data.xlsx');
