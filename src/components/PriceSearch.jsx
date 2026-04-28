import React, { useState, useEffect } from 'react';
import { Search, History, Building2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchByPN } from '../db';

const PriceSearch = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 초기 쿼리가 변경되면 검색 수행
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (val) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchByPN(val.trim());
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-white/40">
          <Search size={24} />
        </div>
        <input
          type="text"
          placeholder="검색할 품명(PN)을 입력하세요..."
          className="w-full bg-white/10 border border-white/20 rounded-2xl py-5 pl-14 pr-6 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-md transition-all placeholder:text-white/20"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {results.length > 0 ? (
            results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 rounded-2xl backdrop-blur-xl border border-white/10 ${
                  index === 0 ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 ring-1 ring-blue-400/30' : 'bg-white/5'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-2 inline-block ${
                      index === 0 ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'
                    }`}>
                      {index === 0 ? '최근 판매 정보' : '이전 기록'}
                    </span>
                    <h4 className="text-2xl font-bold">{item.pn}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-blue-400">
                      ₩{item.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(item.uploadDate).toLocaleDateString()} 업로드
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="flex items-center text-white/70">
                    <Building2 size={18} className="mr-2 text-blue-400/60" />
                    <span className="text-sm font-medium">{item.vendor}</span>
                  </div>
                  <div className="flex items-center text-white/70">
                    <Tag size={18} className="mr-2 text-purple-400/60" />
                    <span className="text-sm font-medium">{item.price > 0 ? '정상 거래' : '정보 없음'}</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : query && !isSearching ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10"
            >
              <p className="text-white/40 text-lg">"{query}"에 대한 검색 결과가 없습니다.</p>
              <p className="text-white/20 text-sm mt-2">먼저 해당 데이터가 포함된 엑셀 파일을 업로드해 보세요.</p>
            </motion.div>
          ) : !query && (
            <div className="text-center py-20">
              <History size={64} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/30 italic">품명을 입력하면 저장된 DB에서 가격 정보를 조회합니다.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PriceSearch;
