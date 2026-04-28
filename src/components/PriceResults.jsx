import React from 'react';
import { ShoppingCart, CheckCircle, Search, TrendingUp, User } from 'lucide-react';

const PriceResults = ({ approvalResults, historyResults, searchQuery, historyHeaders }) => {
  if (!searchQuery) {
    return (
      <div className="empty-state glass-card">
        <Search size={48} className="text-muted mb-4 opacity-20" />
        <p>PartNumber를 입력하여 조회를 시작하세요.</p>
      </div>
    );
  }

  // 판매이력 정렬: 연도(colA) -> 분기(colB) -> 월(colC) 내림차순
  const sortedHistory = [...historyResults].sort((a, b) => {
    const yearA = parseInt(String(a.colA).replace(/[^0-9]/g, '')) || 0;
    const yearB = parseInt(String(b.colA).replace(/[^0-9]/g, '')) || 0;
    if (yearB !== yearA) return yearB - yearA;

    const qtrA = parseInt(String(a.colB).replace(/[^0-9]/g, '')) || 0;
    const qtrB = parseInt(String(b.colB).replace(/[^0-9]/g, '')) || 0;
    if (qtrB !== qtrA) return qtrB - qtrA;

    const monthA = parseInt(String(a.colC).replace(/[^0-9]/g, '')) || 0;
    const monthB = parseInt(String(b.colC).replace(/[^0-9]/g, '')) || 0;
    return monthB - monthA;
  });

  // 정렬된 결과 중 상위 20개 추출
  const limitedHistory = sortedHistory.slice(0, 20);

  return (
    <div className="results-container mt-6">
      {/* 승인단가 섹션 */}
      <div className="glass-card mb-4 border-l-4 border-l-blue-500">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="text-blue-400" size={20} />
          <h3 className="text-xl font-bold">1. 승인단가 결과 (원가기준)</h3>
        </div>
        
        {approvalResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvalResults.map((item, idx) => {
              const isFCA = item.type === 'FCA';
              return (
                <div key={idx} className={`p-4 rounded-xl border ${
                  isFCA ? 'bg-blue-500/5 border-blue-500/20' : 'bg-green-500/5 border-green-500/20'
                }`}>
                  <div className="text-sm text-muted mb-1 font-bold">
                    {item.type} (Material: {item.partNumber})
                  </div>
                  <div className={`text-3xl font-black ${isFCA ? 'text-blue-400' : 'text-green-400'}`}>
                    {isFCA ? '$ ' : '￦ '}
                    {isFCA 
                      ? Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : Number(item.price).toLocaleString()
                    }
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-muted italic">조회된 승인단가 정보가 없습니다.</div>
        )}
      </div>

      {/* 판매이력 섹션 */}
      <div className="glass-card border-l-4 border-l-purple-500 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-purple-400" size={20} />
          <h3 className="text-xl font-bold">2. 판매이력 상세 결과 (최근 20개)</h3>
        </div>

        {limitedHistory.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="results-table w-full text-nowrap">
              <thead>
                <tr>
                  <th className="sticky-col left-0 bg-dark z-10">{historyHeaders?.colA || 'Year'}</th>
                  <th>{historyHeaders?.colB || 'Qtr'}</th>
                  <th>{historyHeaders?.colC || 'Month'}</th>
                  <th>{historyHeaders?.colD || 'Customer'}</th>
                  <th className="min-w-[180px] text-accent font-bold italic">{historyHeaders?.colH || '품 명'}</th>
                  <th>{historyHeaders?.colI || '수량'}</th>
                  <th className="text-right">{historyHeaders?.colJ || '판매가'}</th>
                  <th className="text-right">{historyHeaders?.colT || '매입단가'}</th>
                  <th className="text-center">{historyHeaders?.colAI || '마진율'}</th>
                  <th className="text-right">{historyHeaders?.colAK || '단가'}</th>
                </tr>
              </thead>
              <tbody>
                {limitedHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="text-center font-mono text-xs opacity-70">{item.colA}</td>
                    <td className="text-center">{item.colB}</td>
                    <td className="text-center">{item.colC}</td>
                    <td>{item.colD}</td>
                    <td className="font-semibold text-accent">{item.colH}</td>
                    <td className="text-center">{Number(item.colI).toLocaleString()}</td>
                    <td className="text-right font-mono font-bold text-blue-300">
                      {Number(item.colJ).toLocaleString()}
                    </td>
                    <td className="text-right font-mono text-purple-300">
                      {Number(item.colT).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.colAI >= 0.2 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {(item.colAI * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right font-bold text-emerald-400">
                      {/* 단가: 500 이하인 경우 달러($)로 간주하는 로직 (FCA 대응용 가제) */}
                      {Number(item.colAK) < 1000 ? '$ ' : '￦ '}
                      {Number(item.colAK).toLocaleString(undefined, { minimumFractionDigits: Number(item.colAK) < 1000 ? 2 : 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-muted italic">조회된 판매이력 정보가 없습니다.</div>
        )}
      </div>

      <style jsx>{`
        .text-accent { color: var(--accent); }
        .text-muted { color: var(--text-muted); }
        .results-table th { background: rgba(0,0,0,0.2); }
        .results-table td { padding: 1.25rem 1rem; border-color: rgba(255,255,255,0.05); }
      `}</style>
    </div>
  );
};

export default PriceResults;
