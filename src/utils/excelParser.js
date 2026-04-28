import * as XLSX from 'xlsx';

/**
 * 엑셀 파일을 읽어 JSON 배열로 변환합니다.
 * @param {File} file 
 * @returns {Promise<Array>}
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        let searchPn = null;
        // 'ORDER' 시트가 있는지 확인하고 H1 셀의 값 추출
        const orderSheetName = workbook.SheetNames.find(name => name.toUpperCase() === 'ORDER');
        if (orderSheetName) {
          const orderSheet = workbook.Sheets[orderSheetName];
          const h1Cell = orderSheet['H1'];
          if (h1Cell && h1Cell.v) {
            searchPn = String(h1Cell.v).trim();
          }
        }

        const sheetName = workbook.SheetNames[0]; // 데이터 저장을 위해서는 여전히 첫 번째 시트 사용
        const workbookSheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(workbookSheet);
        
        // 데이터 정제: PN, Price, Vendor 등 필드 매핑 및 날짜 추가
        const formattedData = rows.map(row => {
          // 엑셀 헤더 이름에 따라 유연하게 대응 (한글/영어 지원)
          const pn = row['품명'] || row['PN'] || row['PartNumber'] || row['pn'] || '';
          const price = row['가격'] || row['판매가'] || row['Price'] || row['price'] || 0;
          const vendor = row['업체'] || row['업체명'] || row['Vendor'] || row['vendor'] || '알 수 없음';
          
          return {
            pn: String(pn).trim(),
            price: Number(price),
            vendor: String(vendor).trim(),
            uploadDate: new Date().toISOString()
          };
        }).filter(item => item.pn); // PN이 있는 데이터만 저장
        
        resolve({ items: formattedData, searchPn });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
