import React, { useState } from 'react';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseExcelFile } from '../utils/excelParser';
import { savePriceData } from '../db';

const ExcelUpload = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'xlsb') {
      setStatus('error');
      setMessage('엑셀 파일(.xlsx, .xls, .xlsb)만 업로드 가능합니다.');
      return;
    }

    setStatus('loading');
    try {
      const { items, searchPn } = await parseExcelFile(file);
      if (items.length > 0) {
        await savePriceData(items);
        setMessage(`${items.length}개의 항목이 성공적으로 저장되었습니다.`);
      }
      
      if (searchPn) {
        setMessage(prev => `${prev ? prev + ' ' : ''}'ORDER' 시트에서 검색어("${searchPn}")를 발견했습니다.`);
        if (onUploadSuccess) onUploadSuccess(searchPn);
      } else if (items.length > 0) {
        if (onUploadSuccess) onUploadSuccess();
      }
      
      setStatus('success');
      
      // 3초 후 초기 상태로 복구
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage('파일 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging ? 'border-blue-400 bg-blue-400/10' : 'border-white/20 bg-white/5'
        } backdrop-blur-xl p-10 cursor-pointer text-center`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept=".xlsx, .xls, .xlsb"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {status === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium">파일을 분석 중입니다...</p>
            </motion.div>
          ) : status === 'success' ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-green-400"
            >
              <div className="bg-green-400/20 p-4 rounded-full mb-4">
                <FileCheck size={48} />
              </div>
              <p className="text-xl font-bold">업로드 완료!</p>
              <p className="text-sm opacity-80 mt-1">{message}</p>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-red-400"
            >
              <div className="bg-red-400/20 p-4 rounded-full mb-4">
                <AlertCircle size={48} />
              </div>
              <p className="text-xl font-bold">오류 발생</p>
              <p className="text-sm opacity-80 mt-1">{message}</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="bg-white/10 p-5 rounded-full mb-4 text-blue-400">
                <Upload size={48} />
              </div>
              <h3 className="text-2xl font-bold mb-2">엑셀 파일 업로드</h3>
              <p className="text-white/60">
                파일을 여기에 끌어다 놓거나 클릭하여 품목 데이터를 등록하세요.
              </p>
              <p className="text-white/30 text-xs mt-4">
                지원 형식: .xlsx, .xls, .xlsb (헤더: 품명/PN, 가격/판매가, 업체/Vendor 추천)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ExcelUpload;
