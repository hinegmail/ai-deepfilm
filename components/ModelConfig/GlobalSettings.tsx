/**
 * 全局配置组件
 * 包含 API Key 配置和提供商说明
 */

import React, { useState, useEffect } from 'react';
import { Key, Loader2, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { getGlobalApiKey, getProviders } from '../../services/modelRegistry';
import { verifyApiKey } from '../../services/modelService';
import { setGlobalApiKey } from '../../services/geminiService';

interface GlobalSettingsProps {
  onRefresh: () => void;
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ onRefresh }) => {
  const [apiKey, setApiKey] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');

  useEffect(() => {
    const currentKey = getGlobalApiKey() || '';
    setApiKey(currentKey);
    if (currentKey) {
      setVerifyStatus('success');
      setVerifyMessage('API Key 已配置');
    }
  }, []);

  const handleVerifyAndSave = async () => {
    if (!apiKey.trim()) {
      setVerifyStatus('error');
      setVerifyMessage('请输入 API Key');
      return;
    }

    setIsVerifying(true);
    setVerifyStatus('idle');
    setVerifyMessage('');

    try {
      const result = await verifyApiKey(apiKey.trim());
      
      if (result.success) {
        setVerifyStatus('success');
        setVerifyMessage('验证成功！API Key 已保存');
        setGlobalApiKey(apiKey.trim());
        onRefresh();
      } else {
        setVerifyStatus('error');
        setVerifyMessage(result.message);
      }
    } catch (error: any) {
      setVerifyStatus('error');
      setVerifyMessage(error.message || '验证过程出错');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearKey = () => {
    setApiKey('');
    setVerifyStatus('idle');
    setVerifyMessage('');
    setGlobalApiKey('');
    onRefresh();
  };

  const providers = getProviders().filter(p => p.isBuiltIn);

  return (
    <div className="space-y-6">
      {/* 提供商说明卡片 */}
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-cyan-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-white mb-2">支持的 API 提供商</h3>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              本应用支持多家 OpenAI 兼容格式的模型服务提供商。选择适合你的服务商，配置对应的 API Key。
            </p>
            
            <div className="space-y-2">
              {providers.map(provider => (
                <div key={provider.id} className="bg-white/[0.03] rounded-lg p-3 border border-white/5">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-xs font-semibold text-white">{provider.name}</h4>
                    {provider.isDefault && (
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-300/10 px-2 py-0.5 rounded">默认</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500">{provider.baseUrl}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* API Key 配置 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-cyan-300" />
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            全局 API Key
          </label>
        </div>
        
        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setVerifyStatus('idle');
              setVerifyMessage('');
            }}
            placeholder="输入你的 API Key..."
            className="w-full bg-white/[0.06] border border-white/10 text-white px-4 py-3 text-sm rounded-xl focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/10 transition-all font-mono placeholder:text-slate-500"
            disabled={isVerifying}
          />
          
          {/* 状态提示 */}
          {verifyMessage && (
            <div className={`flex items-center gap-2 text-xs ${
              verifyStatus === 'success' ? 'text-green-400' : 'text-red-400'
            }`}>
              {verifyStatus === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {verifyMessage}
            </div>
          )}

          {/* 说明文字 */}
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            全局 API Key 用于所有模型调用。你也可以为单个提供商配置独立的 API Key。
          </p>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {getGlobalApiKey() && (
              <button
                onClick={handleClearKey}
                className="flex-1 py-3 bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xl border border-white/10"
              >
                清除 Key
              </button>
            )}
            <button
              onClick={handleVerifyAndSave}
              disabled={isVerifying || !apiKey.trim()}
              className="flex-1 py-3 bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-cyan-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  验证中...
                </>
              ) : (
                '验证并保存'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 配置指南 */}
      <div className="p-4 bg-white/[0.045] rounded-2xl border border-white/10">
        <h4 className="text-xs font-bold text-zinc-400 mb-3">配置指南</h4>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-white mb-1">选择提供商</p>
            <p className="text-[10px] text-zinc-600">在"模型配置"中选择你要使用的 API 提供商和具体模型</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white mb-1">配置 API Key</p>
            <p className="text-[10px] text-zinc-600">全局 API Key 用于所有模型；也可为单个提供商配置独立 Key</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white mb-1">调整模型参数</p>
            <p className="text-[10px] text-zinc-600">在各模型类别中调整温度、Token 上限等参数</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-white mb-1">隐私保护</p>
            <p className="text-[10px] text-zinc-600">所有配置仅保存在本地浏览器，不会上传到任何服务器</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSettings;
