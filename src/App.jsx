import React, { useState, useMemo, useEffect } from 'react';
import ExcelUploader from './components/ExcelUploader';
import PriceResults from './components/PriceResults';
import PriceCalculator from './components/PriceCalculator';
import { Search, Database, FileSpreadsheet, Activity } from 'lucide-react';

import { db, saveParsedData, loadInitialStatus, searchInDB } from './db';

/**
 * Price Checker Pro - 고성능 DB 직접 검색 아키텍처
 */
function App() {
  // 1. 상태 관리 (검색 결과 및 카운트만 보관)
  const [filteredApproval, setFilteredApproval] = useState([]); 
  const [filteredHistory, setFilteredHistory] = useState([]);   
  const [approvalCount, setApprovalCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [metadata, setMetadata] = useState({});
  const [searchQuery, setSearchQuery] = useState('');    
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isDBLoading, setIsDBLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(1350); // 기본 환율 설정

  // 2. 검색 디바운싱 (입력 중 멈춤 방지)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250); // 0.25초 지연

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 3. 초기 상태 로드 (데이터 본문이 아닌 건수와 정보만 로드)
  useEffect(() => {
    let isMounted = true;
    
    // 타임아웃: 5초 이상 로딩되면 강제 중단
    const timeout = setTimeout(() => {
      if (isMounted && isDBLoading) {
        console.warn("DB 로딩 타임아웃 발생");
        setIsDBLoading(false);
      }
    }, 5000);

    async function init() {
      try {
        const { metadata, approvalCount, historyCount } = await loadInitialStatus();
        if (isMounted) {
          setMetadata(metadata);
          setApprovalCount(approvalCount);
          setHistoryCount(historyCount);
        }
      } catch (err) {
        console.error("초기 로딩 오류:", err);
      } finally {
        if (isMounted) {
          setIsDBLoading(false);
          clearTimeout(timeout);
        }
      }
    }
    init();
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  // 4. DB 직접 검색 수행 (성능 최적화의 핵심)
  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearchQuery) {
        setFilteredApproval([]);
        setFilteredHistory([]);
        return;
      }

      setIsSearching(true);
      try {
        // 병렬 검색으로 속도 극대화
        const [appRes, histRes] = await Promise.all([
          searchInDB('approval', debouncedSearchQuery, 50), // 승인단가 최대 50건
          searchInDB('history', debouncedSearchQuery, 500)   // 판매이력 최대 500건으로 확대
        ]);
        setFilteredApproval(appRes);
        setFilteredHistory(histRes);
      } catch (err) {
        console.error("검색 중 오류:", err);
      } finally {
        setIsSearching(false);
      }
    }
    performSearch();
  }, [debouncedSearchQuery]);

  // 5. 데이터 업데이트 및 저장
  const handleDataParsed = async (type, data, fileName, headers = null) => {
    try {
      await saveParsedData(type, data, fileName, headers);
      
      // 화면에 즉시 카운트 반영
      if (type === 'approval') setApprovalCount(data.length);
      else setHistoryCount(data.length);
      
      setMetadata(prev => ({
        ...prev,
        [type]: { 
          fileName, 
          uploadDate: new Date().toLocaleString('ko-KR'),
          headers: headers || prev[type]?.headers 
        }
      }));

      // 현재 검색어가 있다면 검색 결과도 갱신
      if (debouncedSearchQuery) {
          const newRes = await searchInDB(type, debouncedSearchQuery, type === 'approval' ? 50 : 500);
          if (type === 'approval') setFilteredApproval(newRes);
          else setFilteredHistory(newRes);
      }
    } catch (err) {
      console.error(err);
      alert("데이터 저장 중 오류가 발생했습니다.");
    }
  };

  if (isDBLoading) {
    return <div className="loading-screen">데이터베이스 연결 중...</div>;
  }

  return (
    <div className="container">
      {/* 헤더 섹션 */}
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="text-primary" size={32} />
          <h1 className="text-4xl font-extrabold tracking-tight">Price Checker Pro</h1>
        </div>
        <p className="text-muted text-lg">고성능 DB 직접 검색 시스템</p>
      </header>

      {/* 업로드 섹션 */}
      <section className="upload-grid">
        <ExcelUploader 
          type="approval" 
          label="1. 승인단가 (원가기준)" 
          lastUpdateInfo={metadata.approval}
          onDataParsed={(data, fileName) => handleDataParsed('approval', data, fileName)} 
        />
        <ExcelUploader 
          type="history" 
          label="2. 판매이력 (기존거래)" 
          lastUpdateInfo={metadata.history}
          onDataParsed={(data, fileName) => handleDataParsed('history', data, fileName)} 
        />
      </section>

      {/* 단가 시뮬레이션 섹션 (신규) */}
      <PriceCalculator 
        approvalResults={filteredApproval} 
        exchangeRate={exchangeRate} 
        setExchangeRate={setExchangeRate} 
      />

      {/* 검색 및 결과 섹션 */}
      <section className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Database className="text-accent" size={24} />
            <h2 className="text-2xl font-bold">통합 단가 검색</h2>
          </div>
          {isSearching && <div className="text-xs text-primary animate-pulse font-bold tracking-widest">QUERYING DB...</div>}
        </div>

        <div className="input-container">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-primary' : 'text-muted'}`} size={20} />
            <input 
              type="text" 
              className="search-input pl-12"
              placeholder="조회할 PartNumber(Material)을 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <PriceResults 
          approvalResults={filteredApproval} 
          historyResults={filteredHistory} 
          searchQuery={debouncedSearchQuery}
          historyHeaders={metadata.history?.headers}
        />
      </section>

      {/* 하단 푸터 */}
      <footer className="mt-20 text-center text-muted text-sm pb-10">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>승인단가: {approvalCount.toLocaleString()}건</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>판매이력: {historyCount.toLocaleString()}건</span>
          </div>
        </div>
        <p>© 2026 Price Check System • Advanced DB Engine</p>
      </footer>
    </div>
  );
}

export default App;
