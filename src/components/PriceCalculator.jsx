import React, { useState } from 'react';
import { Calculator, Globe, ArrowRight } from 'lucide-react';

const PriceCalculator = ({ approvalResults, exchangeRate, setExchangeRate }) => {
  const [liveRates, setLiveRates] = useState(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState(null);

  // 실시간 환율 가져오기 (ExchangeRate-API 적용)
  const fetchRates = async () => {
    setIsLoadingRates(true);
    setRatesError(null);
    try {
      const response = await fetch('https://v6.exchangerate-api.com/v6/604d2abf1ac8bdf5191506d1/latest/USD');
      const apiData = await response.json();
      
      if (apiData.result === 'success') {
        const rates = apiData.conversion_rates;
        const krw = rates.KRW;
        
        // 기존 UI와 호환되도록 데이터 구조 변환 (JPY는 100엔 기준)
        const data = [
          { currencyCode: 'USD', basePrice: Math.round(krw * 100) / 100 },
          { currencyCode: 'JPY', basePrice: Math.round((krw / rates.JPY * 100) * 100) / 100 },
          { currencyCode: 'CNY', basePrice: Math.round((krw / rates.CNY) * 100) / 100 }
        ];

        setLiveRates(data);
        // 기본적으로 달러 송금 환율을 초기값으로 제안 (선택사항)
        const usdRate = data.find(r => r.currencyCode === 'USD');
        if (usdRate && exchangeRate === 1350) {
          setExchangeRate(usdRate.basePrice + 14.5); // 대략적인 송금 환율 가산 (USD 기준)
        }
      } else {
        throw new Error(apiData['error-type'] || "API 반환 오류");
      }
    } catch (err) {
      console.error("환율 로드 실패:", err);
      setRatesError(err.message);
    } finally {
      setIsLoadingRates(false);
    }
  };

  React.useEffect(() => {
    fetchRates();
  }, []);

  if (!approvalResults || approvalResults.length === 0) return null;

  // 올림 함수 (Round -2: 100원 단위 올림)
  const roundUp100 = (val) => Math.ceil(val / 100) * 100;

  // 마진 계산 함수: E / (1 - marginRate)
  const calcMargin = (base, rate) => Math.round(base / (1 - rate));

  return (
    <section className="glass-card mb-8 border-l-4 border-l-emerald-500">
      <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="text-emerald-400" size={24} />
          <h2 className="text-2xl font-bold">단가 시뮬레이션 (수익성 분석)</h2>
        </div>
        
        {/* 실시간 환율 보드 */}
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 ml-auto">
          {liveRates ? (
            <div className="flex gap-4">
              {liveRates.map(rate => (
                <div 
                  key={rate.currencyCode} 
                  className="flex flex-col gap-1 px-3 border-r border-white/10 last:border-0 cursor-pointer hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setExchangeRate(rate.basePrice + (rate.currencyCode === 'USD' ? 14.5 : rate.currencyCode === 'JPY' ? 9.1 : 6.4))}
                  title="클릭 시 송금 환율로 적용"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-blue-400">{rate.currencyCode}</span>
                    <span className="text-xs font-mono font-bold">￦{rate.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="text-[9px] text-muted flex justify-between gap-2">
                    <span>송금</span>
                    <span className="text-emerald-400">￦{(rate.basePrice + (rate.currencyCode === 'USD' ? 14.5 : rate.currencyCode === 'JPY' ? 9.1 : 6.4)).toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : ratesError ? (
            <div className="text-xs text-red-400 px-4">환율 로드 실패: {ratesError}</div>
          ) : (
            <div className="text-xs text-muted animate-pulse px-10">환율 정보 로드 중...</div>
          )}

          <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
            <Globe size={18} className="text-emerald-400" />
            <span className="text-sm font-medium">적용 환율:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs opacity-60">￦</span>
              <input 
                type="number" 
                className="bg-transparent border-b border-emerald-500/50 w-16 text-center outline-none focus:border-emerald-500 font-bold"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="results-table w-full text-nowrap text-sm">
          <thead>
            <tr className="text-center">
              <th className="bg-emerald-500/10">품명 (A)</th>
              <th className="bg-emerald-500/10">단가 (B)</th>
              <th>기준가격 (C)</th>
              <th className="text-blue-300">부대비용 1.16 (D)</th>
              <th className="text-emerald-300">Round -2 (E)</th>
              <th className="bg-white/5">마진 10% (F)</th>
              <th className="bg-white/5">마진 20% (G)</th>
              <th className="bg-white/5">마진 25% (H)</th>
              <th className="bg-white/5">마진 30% (I)</th>
              <th className="bg-white/5">마진 40% (J)</th>
              <th className="bg-white/5">마진 50% (K)</th>
            </tr>
          </thead>
          <tbody>
            {approvalResults.map((item, idx) => {
              const isFCA = item.type === 'FCA';
              const unitPrice = Number(item.price);
              
              // C: 가격 (FCA는 환율 적용)
              const basePrice = isFCA ? unitPrice * exchangeRate : unitPrice;
              
              // D: 부대비용 (C * 1.16)
              const costWithExtra = basePrice * 1.16;
              
              // E: Round -2
              const roundedPrice = roundUp100(costWithExtra);

              return (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="font-bold text-accent">{item.partNumber}</td>
                  <td className="text-center font-mono">
                    <span className="text-[10px] opacity-50 mr-1">{item.type}</span>
                    {isFCA ? `$ ${unitPrice.toFixed(2)}` : `￦ ${unitPrice.toLocaleString()}`}
                  </td>
                  <td className="text-right font-mono">￦ {Math.round(basePrice).toLocaleString()}</td>
                  <td className="text-right font-mono text-blue-300">￦ {Math.round(costWithExtra).toLocaleString()}</td>
                  <td className="text-right font-mono font-bold text-emerald-400 bg-emerald-500/5">
                    ￦ {roundedPrice.toLocaleString()}
                  </td>
                  {/* 마진율 적용 칼럼들 (E열 기준으로 계산) */}
                  {[0.1, 0.2, 0.25, 0.3, 0.4, 0.5].map((rate, rIdx) => (
                    <td key={rIdx} className="text-right font-mono text-xs opacity-90 border-l border-white/5">
                      {calcMargin(roundedPrice, rate).toLocaleString()}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted italic">
        <div className="flex items-center gap-1">
          <ArrowRight size={12} /> C = B * (FCA면 환율 적용)
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight size={12} /> D = C * 1.16
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight size={12} /> E = D 올림(100단위)
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight size={12} /> F~K = E / (1 - 마진율)
        </div>
      </div>
    </section>
  );
};

export default PriceCalculator;
