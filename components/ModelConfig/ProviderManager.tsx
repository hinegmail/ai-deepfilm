/**
 * API 提供商管理组件
 * 支持查看、添加、编辑和删除自定义 API 提供商
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, AlertCircle, Copy, Star } from 'lucide-react';
import { ModelProvider } from '../../types/model';
import { 
  getProviders, 
  addProvider, 
  updateProvider, 
  removeProvider 
} from '../../services/modelRegistry';
import { useAlert } from '../GlobalAlert';

interface ProviderManagerProps {
  onRefresh: () => void;
}

const ProviderManager: React.FC<ProviderManagerProps> = ({ onRefresh }) => {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', baseUrl: '', apiKey: '' });
  const { showAlert } = useAlert();

  useEffect(() => {
    setProviders(getProviders());
  }, []);

  const resetForm = () => {
    setFormData({ name: '', baseUrl: '', apiKey: '' });
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({ name: '', baseUrl: '', apiKey: '' });
  };

  const handleEdit = (provider: ModelProvider) => {
    setEditingId(provider.id);
    setIsAddingNew(false);
    setFormData({
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey || '',
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showAlert('请输入提供商名称', { type: 'warning' });
      return;
    }
    if (!formData.baseUrl.trim()) {
      showAlert('请输入 API 基础 URL', { type: 'warning' });
      return;
    }

    try {
      if (isAddingNew) {
        const newProvider = addProvider({
          name: formData.name.trim(),
          baseUrl: formData.baseUrl.trim(),
          apiKey: formData.apiKey.trim() || undefined,
        });
        showAlert(`提供商 "${newProvider.name}" 添加成功`, { type: 'success' });
      } else if (editingId) {
        const success = updateProvider(editingId, {
          name: formData.name.trim(),
          baseUrl: formData.baseUrl.trim(),
          apiKey: formData.apiKey.trim() || undefined,
        });
        if (success) {
          showAlert('提供商更新成功', { type: 'success' });
        } else {
          showAlert('提供商更新失败', { type: 'error' });
          return;
        }
      }

      setProviders(getProviders());
      resetForm();
      onRefresh();
    } catch (error: any) {
      showAlert(error.message || '操作失败', { type: 'error' });
    }
  };

  const handleDelete = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (provider.isBuiltIn) {
      showAlert('内置提供商不能删除', { type: 'warning' });
      return;
    }

    if (confirm(`确定要删除提供商 "${provider.name}" 吗？\n\n相关的模型也会被删除。`)) {
      try {
        const success = removeProvider(providerId);
        if (success) {
          showAlert(`提供商 "${provider.name}" 已删除`, { type: 'success' });
          setProviders(getProviders());
          onRefresh();
        } else {
          showAlert('删除失败', { type: 'error' });
        }
      } catch (error: any) {
        showAlert(error.message || '删除失败', { type: 'error' });
      }
    }
  };

  const handleSetDefault = (providerId: string) => {
    try {
      // 先取消所有其他提供商的默认状态
      getProviders().forEach(p => {
        if (p.id !== providerId && p.isDefault) {
          updateProvider(p.id, { isDefault: false });
        }
      });
      // 设置新的默认提供商
      const success = updateProvider(providerId, { isDefault: true });
      if (success) {
        showAlert('已设置为默认提供商', { type: 'success' });
        setProviders(getProviders());
        onRefresh();
      } else {
        showAlert('设置失败', { type: 'error' });
      }
    } catch (error: any) {
      showAlert(error.message || '设置失败', { type: 'error' });
    }
  };

  const builtInProviders = providers.filter(p => p.isBuiltIn);
  const customProviders = providers.filter(p => !p.isBuiltIn);

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-cyan-300 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-white mb-1">关于 API 提供商</h3>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              这里显示所有可用的 API 提供商。内置提供商无法删除，但可以编辑 API Key。
              你可以添加自定义提供商来支持其他 OpenAI 兼容的 API 服务。
            </p>
          </div>
        </div>
      </div>

      {/* 内置提供商 */}
      {builtInProviders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">内置提供商</h3>
          <div className="space-y-2">
            {builtInProviders.map(provider => (
              <div
                key={provider.id}
                className="bg-white/[0.06] border border-white/10 rounded-xl p-4 flex items-start justify-between group hover:border-white/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-white">{provider.name}</h4>
                    {provider.isDefault && (
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-300/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" />
                        默认
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-mono break-all">{provider.baseUrl}</p>
                  {provider.apiKey && (
                    <p className="text-[10px] text-zinc-600 mt-1">已配置 API Key</p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!provider.isDefault && (
                    <button
                      onClick={() => handleSetDefault(provider.id)}
                      className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                      title="设置为默认"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="编辑 API Key"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 自定义提供商 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">自定义提供商</h3>
          {!isAddingNew && !editingId && (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加提供商
            </button>
          )}
        </div>

        {customProviders.length === 0 && !isAddingNew && !editingId && (
          <div className="bg-white/[0.03] border border-dashed border-white/10 rounded-xl p-8 text-center">
            <p className="text-xs text-zinc-600">暂无自定义提供商</p>
            <p className="text-[10px] text-zinc-600 mt-1">点击右上角"添加提供商"按钮创建新的提供商</p>
          </div>
        )}

        <div className="space-y-2">
          {customProviders.map(provider => (
            <div
              key={provider.id}
              className="bg-white/[0.06] border border-white/10 rounded-xl p-4 flex items-start justify-between group hover:border-white/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-white">{provider.name}</h4>
                  {provider.isDefault && (
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-300/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />
                      默认
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 font-mono break-all">{provider.baseUrl}</p>
                {provider.apiKey && (
                  <p className="text-[10px] text-zinc-600 mt-1">已配置 API Key</p>
                )}
              </div>
              <div className="ml-3 flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {!provider.isDefault && (
                  <button
                    onClick={() => handleSetDefault(provider.id)}
                    className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                    title="设置为默认"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleEdit(provider)}
                  className="p-2 text-zinc-500 hover:text-cyan-300 hover:bg-white/10 rounded-lg transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {(isAddingNew || editingId) && (
        <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white">
            {isAddingNew ? '添加新提供商' : '编辑提供商'}
          </h3>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest">
              提供商名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="如：My AI API、Local LLM 等"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/10"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest">
              API 基础 URL *
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="如：https://api.example.com/v1 或 http://localhost:8000/v1"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/10 font-mono"
            />
            <p className="text-[9px] text-zinc-600 mt-1">
              基础 URL 是 API 端点的根地址（不包含 /chat/completions 等）
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 block mb-2 uppercase tracking-widest">
              API Key（可选）
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="留空则使用全局 API Key"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/10 font-mono"
            />
            <p className="text-[9px] text-zinc-600 mt-1">
              为此提供商单独配置 API Key，留空则使用全局配置的 Key
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-cyan-300 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-200 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              {isAddingNew ? '添加' : '保存'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 bg-white/10 text-zinc-400 text-xs rounded-xl hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              取消
            </button>
          </div>
        </div>
      )}

      {/* 常见的 API 提供商模板 */}
      <div className="bg-white/[0.045] border border-white/10 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">常见 API 提供商模板</h3>
        <div className="space-y-2 text-[10px]">
          <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-zinc-500 break-all">
            <p className="font-bold text-white mb-1">Together AI:</p>
            https://api.together.xyz/v1
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-zinc-500 break-all">
            <p className="font-bold text-white mb-1">Groq:</p>
            https://api.groq.com/openai/v1
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-zinc-500 break-all">
            <p className="font-bold text-white mb-1">Azure OpenAI:</p>
            https://&lt;resource-name&gt;.openai.azure.com/v1
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-zinc-500 break-all">
            <p className="font-bold text-white mb-1">本地 vLLM:</p>
            http://localhost:8000/v1
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5 font-mono text-zinc-500 break-all">
            <p className="font-bold text-white mb-1">本地 Text Generation WebUI:</p>
            http://localhost:5000/v1
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderManager;
