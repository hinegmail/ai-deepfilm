/**
 * 提供商健康检查组件
 * 显示提供商连接状态和 API Key 验证结果
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { ModelProvider } from '../../types/model';
import { 
  checkProviderHealth, 
  validateModelApiKey,
  HealthCheckResult,
  ApiKeyValidationResult,
} from '../../services/providerHealthCheck';
import { getProviders, getModels } from '../../services/modelRegistry';
import { useAlert } from '../GlobalAlert';

const ProviderHealthCheck: React.FC = () => {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [healthResults, setHealthResults] = useState<Map<string, HealthCheckResult>>(new Map());
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    setProviders(getProviders());
  }, []);

  const handleCheckHealth = async (providerId: string) => {
    setIsChecking(true);
    try {
      const result = await checkProviderHealth(providerId);
      setHealthResults(prev => new Map(prev).set(providerId, result));
      setLastCheckTime(Date.now());

      // 根据结果显示通知
      if (result.status === 'healthy') {
        showAlert(`${result.provider} 连接正常`, { type: 'success' });
      } else if (result.status === 'invalid_key') {
        showAlert(`${result.provider} API Key 未配置或无效`, { type: 'warning' });
      } else {
        showAlert(`${result.provider} 检查失败: ${result.message}`, { type: 'error' });
      }
    } catch (error: any) {
      showAlert(`健康检查失败: ${error.message}`, { type: 'error' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckAll = async () => {
    setIsChecking(true);
    try {
      const newResults = new Map<string, HealthCheckResult>();
      
      for (const provider of providers) {
        const result = await checkProviderHealth(provider.id);
        newResults.set(provider.id, result);
        // 添加一个小延迟，避免过快的连续请求
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      setHealthResults(newResults);
      setLastCheckTime(Date.now());

      const summary = {
        total: providers.length,
        healthy: Array.from(newResults.values()).filter(r => r.status === 'healthy').length,
      };
      showAlert(
        `检查完成: ${summary.healthy}/${summary.total} 个提供商连接正常`,
        { type: 'success' }
      );
    } catch (error: any) {
      showAlert(`批量检查失败: ${error.message}`, { type: 'error' });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'invalid_key':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'timeout':
        return <Clock className="w-4 h-4 text-orange-400" />;
      default:
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300';
      case 'invalid_key':
        return 'bg-yellow-400/10 border-yellow-400/30 text-yellow-300';
      case 'timeout':
        return 'bg-orange-400/10 border-orange-400/30 text-orange-300';
      default:
        return 'bg-red-400/10 border-red-400/30 text-red-300';
    }
  };

  const getStatusText = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'healthy':
        return '连接正常';
      case 'invalid_key':
        return 'API Key 问题';
      case 'timeout':
        return '请求超时';
      default:
        return '连接失败';
    }
  };

  const formatTime = (ms: number | undefined) => {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const formatLastCheck = () => {
    if (!lastCheckTime) return '未检查';
    const now = Date.now();
    const diff = now - lastCheckTime;
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else {
      return `${Math.floor(diff / 3600000)} 小时前`;
    }
  };

  return (
    <div className="space-y-6">
      {/* 说明和操作 */}
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Activity className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-white mb-1">提供商健康检查</h3>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                检测 API 连接是否正常，验证 API Key 是否有效。最后检查: {formatLastCheck()}
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckAll}
            disabled={isChecking}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            全部检查
          </button>
        </div>
      </div>

      {/* 提供商列表 */}
      <div className="space-y-2">
        {providers.map(provider => {
          const healthResult = healthResults.get(provider.id);
          const isExpanded = expandedProvider === provider.id;

          return (
            <div key={provider.id} className="bg-white/[0.06] border border-white/10 rounded-xl overflow-hidden">
              {/* 提供商行 */}
              <div className="p-4 flex items-center justify-between group hover:bg-white/[0.08] transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 状态指示 */}
                  <div className="flex-shrink-0">
                    {healthResult ? (
                      getStatusIcon(healthResult.status)
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-500 border-t-cyan-300 animate-spin" />
                    )}
                  </div>

                  {/* 提供商信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white truncate">{provider.name}</h4>
                      {healthResult && (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusColor(healthResult.status)}`}>
                          {getStatusText(healthResult.status)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 truncate">{provider.baseUrl}</p>
                  </div>

                  {/* 响应时间 */}
                  {healthResult && (
                    <div className="flex-shrink-0 ml-2">
                      <p className="text-[9px] text-zinc-500 text-right">
                        {formatTime(healthResult.responseTime)}
                      </p>
                    </div>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="ml-3 flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCheckHealth(provider.id)}
                    disabled={isChecking}
                    className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="检查此提供商"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                    className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 详细信息面板 */}
              {isExpanded && (
                <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] space-y-3">
                  {healthResult ? (
                    <>
                      {/* 健康检查结果 */}
                      <div>
                        <h5 className="text-[10px] font-bold text-zinc-400 uppercase mb-2">健康检查结果</h5>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">状态:</span>
                            <span className={`font-bold ${healthResult.status === 'healthy' ? 'text-emerald-300' : 'text-red-300'}`}>
                              {getStatusText(healthResult.status)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">消息:</span>
                            <span className="text-zinc-400 text-right max-w-xs">{healthResult.message}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">响应时间:</span>
                            <span className="text-zinc-400">{formatTime(healthResult.responseTime)}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600">检查时间:</span>
                            <span className="text-zinc-400">
                              {new Date(healthResult.timestamp).toLocaleTimeString('zh-CN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 模型列表 */}
                      <ModelListForProvider providerId={provider.id} />
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <div className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-cyan-300 animate-spin" />
                        检查中...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 帮助信息 */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white mb-2">常见问题</h3>
        <ul className="space-y-1.5 text-[9px] text-zinc-500">
          <li>• <span className="text-yellow-300">API Key 问题</span>: 请检查 API Key 是否有效或已过期</li>
          <li>• <span className="text-red-300">连接失败</span>: 检查 API 基础 URL 是否正确，是否有网络连接</li>
          <li>• <span className="text-orange-300">请求超时</span>: API 服务器响应缓慢，请稍后重试</li>
          <li>• 如需添加新提供商，请返回 "API 提供商" 标签页</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 显示提供商下的模型列表及其验证状态
 */
const ModelListForProvider: React.FC<{ providerId: string }> = ({ providerId }) => {
  const [validationResults, setValidationResults] = useState<Map<string, ApiKeyValidationResult>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const { showAlert } = useAlert();

  // 获取该提供商的所有模型，并优先显示用户自定义模型
  const allModels = getModels().filter(m => m.providerId === providerId);
  const customModels = allModels.filter(m => !m.isBuiltIn);
  const builtInModels = allModels.filter(m => m.isBuiltIn);
  
  // 自定义模型排在前面，内置模型排在后面
  // 如果用户有自定义模型，优先显示；否则显示内置模型
  const models = customModels.length > 0 ? customModels : builtInModels;

  const handleValidateModel = async (modelId: string) => {
    setIsValidating(true);
    try {
      const result = await validateModelApiKey(modelId);
      setValidationResults(prev => new Map(prev).set(modelId, result));
    } catch (error: any) {
      showAlert(`验证失败: ${error.message}`, { type: 'error' });
    } finally {
      setIsValidating(false);
    }
  };

  if (models.length === 0) {
    return (
      <div className="text-[9px] text-zinc-500 italic">
        该提供商未配置任何模型
      </div>
    );
  }

  return (
    <div>
      <h5 className="text-[10px] font-bold text-zinc-400 uppercase mb-2">模型验证</h5>
      <div className="space-y-1.5">
        {models.map(model => {
          const result = validationResults.get(model.id);
          return (
            <div key={model.id} className="flex items-center justify-between text-[9px] bg-white/[0.03] rounded p-2">
              <div className="flex items-center gap-2 flex-1">
                {result ? (
                  result.success ? (
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-400" />
                  )
                ) : (
                  <div className="w-3 h-3" />
                )}
                <div className="flex-1">
                  <p className="text-zinc-300">{model.name}</p>
                  {result && (
                    <p className={`text-[8px] ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleValidateModel(model.id)}
                disabled={isValidating}
                className="ml-2 px-2 py-1 text-[8px] bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                验证
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderHealthCheck;
