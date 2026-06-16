import React, { useState, useEffect, useMemo } from 'react';

import ExcelUploader from './components/ExcelUploader';
import PriceResults from './components/PriceResults';
import PriceCalculator from './components/PriceCalculator';

import { Search, Database, FileSpreadsheet, Activity } from 'lucide-react';

import { saveParsedData, loadInitialStatus, searchInDB, clearTable } from './db';

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
  const [exchangeRate, setExchangeRate] = useState(1500); // 기본 환율 설정
  const [isAdmin, setIsAdmin] = useState(false);
    const partAnalysis = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const validSelling = filteredHistory
      .map(item => Number(item.colJ || 0))
      .filter(v => v > 0);

    const avgSelling =
      validSelling.length > 0
        ? validSelling.reduce((a, b) => a + b, 0) / validSelling.length
        : 0;
    
    let marginSum = 0;
    let marginCount = 0;

    filteredHistory.forEach(item => {
      const selling = Number(item.colJ || 0);
      const cost = Number(item.colT || 0);

      if (selling > 0 && cost > 0) {
        const margin = ((selling - cost) / selling) * 100;

        // 이상치 제거
        if (margin >= -100 && margin <= 100) {
          marginSum += margin;
          marginCount++;
        }
      }
    });

    const avgMargin =
      marginCount > 0
        ? marginSum / marginCount
        : 0;


    const customerMap = {};

    filteredHistory.forEach(item => {
      const customer = item.colD || '기타';

      customerMap[customer] =
        (customerMap[customer] || 0) + 1;
    });

    const topCustomer =
      Object.entries(customerMap)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    const sortedHistory = [...filteredHistory].sort((a, b) => {
      const yearA = Number(a.colA || 0);
      const yearB = Number(b.colA || 0);

      if (yearA !== yearB) return yearB - yearA;

      return Number(b.colB || 0) - Number(a.colB || 0);
    });

    const latest = sortedHistory[0];

    return {
      count: filteredHistory.length,
      avgSelling,
      avgMargin,
      topCustomer,
      latest:
        latest
          ? `${latest.colA} ${latest.colB}`
          : '-'
    };
  }, [filteredHistory]);

        const yearlyTrend = useMemo(() => {
          if (filteredHistory.length === 0) return [];

          const trendMap = {};

          filteredHistory.forEach(item => {
            const year = item.colA;
            const selling = Number(item.colJ || 0);

            if (!year || selling <= 0) return;

            if (!trendMap[year]) {
              trendMap[year] = [];
            }

            trendMap[year].push(selling);
          });

          return Object.entries(trendMap)
            .map(([year, prices]) => ({
              year,
              avg:
                prices.reduce((sum, p) => sum + p, 0) /
                prices.length
            }))
            .sort((a, b) => Number(a.year) - Number(b.year));

        }, [filteredHistory]);
      const maxTrend =
        Math.max(...yearlyTrend.map(item => item.avg), 1);

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

    const timeout = setTimeout(() => {
      if (isMounted && isDBLoading) {
        console.warn("DB 로딩 타임아웃 발생");
        setIsDBLoading(false);
      }
    }, 5000);

    async function init() {
      try {
        const {
          metadata,
          approvalCount,
          historyCount
        } = await loadInitialStatus();

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
  const handleDelete = async (type) => {
      const ok = window.confirm(
        `${type === 'approval'
          ? '승인단가'
          : '판매이력'} 데이터를 삭제하시겠습니까?`
      );

      if (!ok) return;

      await clearTable(type);

      if (type === 'approval') {
        setApprovalCount(0);
      } else {
        setHistoryCount(0);
      }

      setMetadata(prev => {
        const copy = { ...prev };
        delete copy[type];
        return copy;
      });

      alert('삭제되었습니다.');
    };
  
  
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
        <p className="text-muted text-lg">판매이력 데이터 분석 기반 견적 의사결정 지원 시스템</p>
  
        <button
          className="admin-btn"
          onClick={() => {
            const pw = prompt("관리자 비밀번호를 입력하세요.");

            if (pw === "snl2025") {
              setIsAdmin(true);
              alert("관리자 모드 활성화");
            } else {
              alert("비밀번호가 올바르지 않습니다.");
            }
          }}
        >
          {isAdmin ? "🔓 관리자" : "🔒 관리자"}
        </button>
  
      </header>
   
      {/* 업로드 섹션 */}
      
      {isAdmin && (
        <section className="upload-grid">
          <ExcelUploader 
            type="approval" 
            label="1. 승인단가 (원가기준)" 
            lastUpdateInfo={metadata.approval}
            onDataParsed={(data, fileName) => handleDataParsed('approval', data, fileName)}
            onDelete={handleDelete} 
          />
          <ExcelUploader 
            type="history" 
            label="2. 판매이력 (기존거래)" 
            lastUpdateInfo={metadata.history}
            onDataParsed={(data, fileName) => handleDataParsed('history', data, fileName)}
            onDelete={handleDelete} 
          />
        </section>
      )}

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

        {partAnalysis && (
          <div className="glass-card mb-6">
            <h3 className="text-xl font-bold mb-4">
              🔍 품목 분석
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              <div>
                <p className="text-sm text-gray-400">거래건수</p>
                <p className="text-2xl font-bold">
                  {partAnalysis.count}건
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">평균 판매가</p>
                <p className="text-2xl font-bold">
                  ₩{Math.round(
                    partAnalysis.avgSelling
                  ).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">평균 마진율</p>
                <p className="text-2xl font-bold">
                  {partAnalysis.avgMargin.toFixed(1)}%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">최근 거래</p>
                <p className="text-2xl font-bold">
                  {partAnalysis.latest}
                </p>
              </div>

            </div>
          </div>
        )}

          {yearlyTrend.length > 0 && (
            <div className="glass-card mb-6">
              <h3 className="text-xl font-bold mb-4">
                📈 판매단가 추이
              </h3>

              {yearlyTrend.map(item => (
                <div
                  key={item.year}
                  className="flex items-center gap-4 mb-3"
                >
                  <span className="w-14 font-semibold">
                    {item.year}
                  </span>

                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div
                        style={{
                        width: `${(item.avg / maxTrend) * 100}%`,
                        height: "16px",
                        backgroundColor: "#22d3ee",
                        borderRadius: "9999px"
                      }}
                    />
                  </div>

                  <span className="w-28 text-right">
                    ₩{Math.round(item.avg).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

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
