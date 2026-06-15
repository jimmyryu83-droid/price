import React from 'react';

function AnalyticsDashboard({ historyCount, dashboardStats }) {
  return (
    <section className="glass-card mb-8">
      <h2 className="text-2xl font-bold mb-6">
        📊 Sales Analytics Dashboard
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* 총 거래건수 */}
        <div className="p-4 rounded-xl bg-slate-800">
          <p className="text-sm text-gray-400">총 거래건수</p>
          <p className="text-2xl font-bold">
            {historyCount.toLocaleString()}건
          </p>
        </div>

        {/* 평균 판매단가 */}
        <div className="p-4 rounded-xl bg-slate-800">
          <p className="text-sm text-gray-400">평균 판매단가</p>
          <p className="text-2xl font-bold">
            ₩{Math.round(
              dashboardStats.avgSellingPrice
            ).toLocaleString()}
          </p>
        </div>

        {/* 평균 마진율 */}
        <div className="p-4 rounded-xl bg-slate-800">
          <p className="text-sm text-gray-400">평균 마진율</p>
          <p className="text-2xl font-bold">
            {dashboardStats.avgMargin.toFixed(1)}%
          </p>
        </div>

        {/* 주요 고객사 */}
        <div className="p-4 rounded-xl bg-slate-800">
          <p className="text-sm text-gray-400">주요 고객사</p>
          <p className="text-2xl font-bold">
            {dashboardStats.topCustomer}
          </p>
        </div>

      </div>
    </section>
  );
}

export default AnalyticsDashboard;