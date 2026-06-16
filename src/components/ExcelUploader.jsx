import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileCheck, AlertCircle, Info, Tag } from 'lucide-react';

/**
 * 엑셀 업로드 컴포넌트 (지능형 파싱 및 디버깅 UI 포함)
 */
const ExcelUploader = ({ type, onDataParsed, label, lastUpdateInfo, onDelete }) => {
  const [fileName, setFileName] = useState(lastUpdateInfo?.fileName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState({ sheets: [], columns: [] });

  // 부모로부터 받은 정보가 업데이트되면 로컬 파일명 상태 반영
  useEffect(() => {
    if (lastUpdateInfo?.fileName) {
      setFileName(lastUpdateInfo.fileName);
    }
  }, [lastUpdateInfo]);

  // 지능형 컬럼 검색 함수: 키워드 리스트 중 가장 유사한 컬럼명을 반환
  const findBestMatch = (allColumns, keywords) => {
    const normalizedCols = allColumns.map(c => ({ original: c, norm: String(c).trim().toLowerCase() }));
    for (const kw of keywords) {
      const match = normalizedCols.find(c => c.norm.includes(kw.toLowerCase()));
      if (match) return match.original;
    }
    return null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setError('');
    setDebugInfo({ sheets: [], columns: [] });

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        let parsedData = [];

        // 단가 세정 함수 (숫자 및 소수점만 추출)
        const cleanPrice = (val) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          return cleaned ? parseFloat(cleaned) : 0;
        };

        setDebugInfo(prev => ({ ...prev, sheets: wb.SheetNames }));

        if (type === 'approval') {
          // 승인단가 처리 로직
          const sheetNames = wb.SheetNames.filter(name => 
            name.toUpperCase().includes('FCA') || 
            name.toUpperCase().includes('DDP') || 
            name.toUpperCase().includes('PURELINE')
          );

          if (sheetNames.length === 0) {
            setError(`FCA, DDP 또는 PURELINE 문구가 포함된 시트를 찾을 수 없습니다. (현재 시트: ${wb.SheetNames.join(', ')})`);
            setIsLoading(false);
            return;
          }

          sheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            const isPureline = sheetName.toUpperCase().includes('PURELINE');
            let processed = [];

            if (isPureline) {
              // 1. PURELINE 시트는 절대 열(C열, O열) 기준 파싱 (header: "A")
              const data = XLSX.utils.sheet_to_json(ws, { header: "A" });
              // 2. 1행(제목행) 제외를 위해 slice(1) 사용
              processed = data.slice(1).map(row => ({
                partNumber: String(row['C'] || '').trim(),
                price: cleanPrice(row['O']),
                type: 'PURELINE'
              })).filter(item => item.partNumber);
              
              if (data.length > 0) {
                setDebugInfo(prev => ({ ...prev, columns: [...new Set([...prev.columns, ...Object.keys(data[0])])] }));
              }
            } else {
              // 일반 승인단가 시트는 지능형 컬럼 매칭 사용
              const data = XLSX.utils.sheet_to_json(ws);
              if (data.length === 0) return;

              const cols = Object.keys(data[0]);
              setDebugInfo(prev => ({ ...prev, columns: [...new Set([...prev.columns, ...cols])] }));

              const pnKey = findBestMatch(cols, ['2019 Part Number', 'Material', 'PN', 'PartNumber', '품번', '품명']);
              const priceKey = findBestMatch(cols, ['S&L 2025-7', "25'", '단가', 'Price', 'UnitPrice', 'FOB', 'Selling']);

              if (!pnKey || !priceKey) {
                setError(`필수 항목 인식 실패: ${!pnKey ? 'Part Number' : '단가/Price'} 컬럼을 찾을 수 없습니다.`);
                return;
              }

              processed = data.map(row => ({
                partNumber: String(row[pnKey] || '').trim(),
                price: cleanPrice(row[priceKey]),
                type: sheetName.toUpperCase().includes('FCA') ? 'FCA' : 'DDP'
              })).filter(item => item.partNumber);
            }
            
            parsedData = [...parsedData, ...processed];
          });
        } else {
          // 판매이력단가 처리 로직
          const sheetNames = wb.SheetNames;
          const targetSheetName = sheetNames.find(n => n.toUpperCase().includes('ORDER')) || sheetNames[0];
          const ws = wb.Sheets[targetSheetName];
          
          // 1. 실제 엑셀 헤더 추출 (첫 번째 행)
          const headerRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const firstRow = headerRows[0] || [];
          
          const getHeader = (idx) => String(firstRow[idx] || `${String.fromCharCode(65 + (idx % 26))}열`).trim();
          
          const extractedHeaders = {
            colA: getHeader(0), colB: getHeader(1), colC: getHeader(2), colD: getHeader(3),
            colH: getHeader(7), colI: getHeader(8), colJ: getHeader(9),
            colT: getHeader(19),
            colAI: getHeader(34), colAK: getHeader(36)
          };

          // 2. 데이터 파싱
          const data = XLSX.utils.sheet_to_json(ws, { header: "A" });
          if (data.length === 0) {
             setError('데이터가 없는 시트입니다.');
             setIsLoading(false);
             return;
          }

          setDebugInfo(prev => ({ ...prev, sheets: sheetNames, columns: Object.keys(data[0]) }));

          // 1행(제목행) 제외를 위해 slice(1) 사용
          parsedData = data.slice(1).map(row => ({
            colA: row['A'] || '-',
            colB: row['B'] || '-',
            colC: row['C'] || '-',
            colD: row['D'] || '-',
            colH: row['H'] || '',
            colI: row['I'] || '-',
            colJ: cleanPrice(row['J']),
            colT: cleanPrice(row['T']),
            colAI: cleanPrice(row['AI']),
            colAK: cleanPrice(row['AK']),
            partNumber: String(row['H'] || '').trim()
          })).filter(item => 
            item.partNumber && 
            !['MATERIAL', '품명', 'P/N', 'PN'].includes(item.partNumber.toUpperCase())
          );

          onDataParsed(parsedData, file.name, extractedHeaders);
          setIsLoading(false);
          return;
        }

        if (parsedData.length > 0) {
          onDataParsed(parsedData, file.name);
        } else {
          setError('해당 조건에 일치하는 데이터가 없습니다.');
        }
        setIsLoading(false);
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      setError('파일 처리 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className={`glass-card uploader-container overflow-hidden ${error ? 'border-red-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-4">

        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            {label}

            {lastUpdateInfo?.uploadDate && (
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-muted font-normal">
                {lastUpdateInfo.uploadDate} 업데이트됨
              </span>
            )}
          </h3>

          {fileName && (
            <span className="text-xs text-blue-400 font-mono italic">
              {fileName}
            </span>
          )}
        </div>

        {/* 삭제 버튼 */}
        {onDelete && (
          <button
            onClick={() => onDelete(type)}
            className="
              px-3 py-1
              text-xs
              rounded-lg
              bg-red-500/20
              text-red-300
              hover:bg-red-500/30
              transition
            "
          >
            삭제
          </button>
        )}

      </div>      
            
      <label className={`upload-zone group ${isLoading ? 'loading pointer-events-none' : ''}`}>
        <input 
          type="file" 
          onChange={handleFileUpload} 
          accept=".xlsx, .xls, .xlsb" 
          style={{ display: 'none' }}
        />
        <div className="upload-content text-center py-6">
          {isLoading ? (
            <div className="spinner mx-auto"></div>
          ) : fileName ? (
            <div className="relative inline-block">
              <FileCheck className="text-green-400 group-hover:scale-110 transition-transform" size={40} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <Upload className="text-muted group-hover:text-primary transition-colors" size={40} />
          )}
          <p className="mt-3 text-sm font-medium">
            {fileName ? '파일 업데이트' : '클릭하여 엑셀 업로드'}
          </p>
        </div>
      </label>

      {/* 디버깅 및 분석 정보 표시 전용 영역 */}
      {(debugInfo.sheets.length > 0 || error) && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted mb-2 font-bold uppercase tracking-wider">
            <Info size={12} /> 데이터 분석 정보
          </div>
          
          <div className="space-y-2">
            {debugInfo.sheets.length > 0 && (
              <div className="debug-row">
                <span className="debug-label">시트:</span>
                <div className="debug-tags">
                  {debugInfo.sheets.map(s => (
                    <span key={s} className={`debug-tag ${s.toUpperCase().includes('FCA') || s.toUpperCase().includes('DDP') || s.toUpperCase().includes('ORDER') ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 opacity-50'}`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {debugInfo.columns.length > 0 && (
              <div className="debug-row">
                <span className="debug-label">컬럼:</span>
                <div className="debug-tags max-h-[60px] overflow-y-auto">
                  {debugInfo.columns.map(c => (
                    <span key={c} className="debug-tag bg-white/10 text-accent">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-msg mt-3 flex items-start gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <span className="text-red-300 text-xs leading-relaxed">{error}</span>
        </div>
      )}

      <style jsx>{`
        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed var(--glass-border);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          background: rgba(255, 255, 255, 0.02);
        }

        .upload-zone:hover {
          border-color: var(--primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 20px rgba(0, 112, 243, 0.1);
        }

        .debug-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .debug-label {
          font-size: 10px;
          color: var(--text-muted);
          shrink: 0;
          padding-top: 2px;
        }

        .debug-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .debug-tag {
          font-size: 9px;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ExcelUploader;
