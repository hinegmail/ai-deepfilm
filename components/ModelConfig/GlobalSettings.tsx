/**
 * 全局配置组件
 * 包含 API Key 配置和折扣广告
 */

import React, { useState, useEffect } from 'react';
import { Key, Loader2, CheckCircle, AlertCircle, ExternalLink, Gift, Sparkles } from 'lucide-react';
import { getGlobalApiKey } from '../../services/modelRegistry';
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

  return (
    <div className="space-y-6">
      {/* 折扣广告卡片 */}
      <div className="bg-gradient-to-r from-cyan-300/10 via-sky-400/10 to-fuchsia-400/10 border border-cyan-200/20 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-300 to-sky-400 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              推荐使用 GitCC API
            </h3>
            <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
              支持 GPT-5.1、GPT-5.2、Claude Sonnet 4.5、Gemini-3、Veo 3.1、Sora-2 等多种模型。
              稳定快速，价格优惠。本开源项目由 GitCC API 提供支持。
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="http://api.gitcc.com" 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-cyan-300 text-slate-950 text-xs font-bold rounded-xl hover:bg-cyan-200 transition-colors inline-flex items-center gap-1.5"
              >
                立即购买
                <ExternalLink className="w-3 h-3" />
              </a>
              {/* 使用教程已隐藏 */}
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

      {/* 提示 */}
      <div className="p-4 bg-white/[0.045] rounded-2xl border border-white/10">
        <h4 className="text-xs font-bold text-zinc-400 mb-2">配置说明</h4>
        <ul className="text-[10px] text-zinc-600 space-y-1 list-disc list-inside">
          <li>全局 API Key 用于所有 GitCC API 内置模型的调用</li>
          <li>你可以在各模型类别中调整模型参数（温度、Token 等）</li>
          <li>支持添加自定义模型，使用其他 API 服务</li>
          <li>所有配置仅保存在本地浏览器，不会上传到服务器</li>
        </ul>
      </div>
    </div>
  );
};

export default GlobalSettings;
