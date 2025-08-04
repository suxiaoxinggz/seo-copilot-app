import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Model, ModelProvider, ApiProvider } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';
import { PlusIcon, TrashIcon, CheckIcon } from './icons';
import Toggle from './ui/Toggle';

const ModelSettings: React.FC = () => {
  const context = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<Model> | null>(null);

  if (!context) return null;

  const { models, defaultModelId, setDefaultModelId, session, supabase, fetchData } = context;

  const handleOpenModal = (model: Partial<Model> | null = null) => {
    if (model) {
        setEditingModel({ ...model });
    } else {
        setEditingModel({ type: ModelProvider.CUSTOM, supportsWebSearch: false, apiProvider: ApiProvider.MOCK });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingModel(null);
    setIsModalOpen(false);
  };

  const handleSaveModel = async () => {
    if (!editingModel || !session || !supabase) return;

    const isExisting = editingModel.id && models.some(m => m.id === editingModel.id);
    
    try {
      if (isExisting) {
        // Update
        const { id, user_id, ...updatePayload } = editingModel;
        const { error } = await supabase
          .from('models')
          .update(updatePayload)
          .eq('id', id as string);
        if (error) throw error;
      } else {
        // Insert
        const insertPayload: Model = {
            id: editingModel.id || `custom-${Date.now()}`,
            nickname: editingModel.nickname || 'Untitled Model',
            apiKey: editingModel.apiKey || '',
            baseURL: editingModel.baseURL || '',
            version: editingModel.version || '',
            supportsWebSearch: editingModel.supportsWebSearch || false,
            type: editingModel.type || ModelProvider.CUSTOM,
            apiProvider: editingModel.apiProvider || ApiProvider.MOCK,
        };
        const { error } = await supabase
          .from('models')
          .insert({ ...insertPayload, user_id: session.user.id });
        if (error) throw error;
      }
      await fetchData(); // Refresh data from DB
      handleCloseModal();
    } catch(error) {
       alert(`Error saving model: ${(error as Error).message}`);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this model?")) {
        if (!supabase) return;
        const { error } = await supabase.from('models').delete().eq('id', id);
        if (error) {
             alert(`Error deleting model: ${error.message}`);
             return;
        }
        await fetchData(); // Refresh data from DB
        if (defaultModelId === id) {
            const newDefault = models.find(m => m.id !== id);
            setDefaultModelId(newDefault?.id || null);
        }
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!supabase || !session) return;
    
    // Using Promise.all to run updates concurrently
    try {
        const [resetResult, setResult] = await Promise.all([
             supabase
              .from('models')
              .update({ isDefault: false })
              .eq('user_id', session.user.id)
              .eq('isDefault', true),
             supabase
              .from('models')
              .update({ isDefault: true })
              .eq('id', id)
        ]);

        if (resetResult.error) throw resetResult.error;
        if (setResult.error) throw setResult.error;
        
        await fetchData();
        setDefaultModelId(id);
        
    } catch (error) {
        alert(`Error setting default model: ${(error as Error).message}`);
    }
  }

  const ModelCard: React.FC<{ model: Model }> = ({ model }) => (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-white">{model.nickname}</h3>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${model.type === ModelProvider.PRESET ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>{model.type}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">Provider: {model.apiProvider}</p>
        <p className={`text-sm mt-2 ${model.supportsWebSearch ? 'text-green-400' : 'text-yellow-400'}`}>
            Web Search: {model.supportsWebSearch ? 'Supported' : 'Not Supported'}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <Button size="sm" variant="secondary" onClick={() => handleOpenModal(model)}>编辑</Button>
            {model.type === ModelProvider.CUSTOM && (
                <Button size="sm" variant="danger" onClick={() => handleDeleteModel(model.id)}><TrashIcon className="w-4 h-4" /></Button>
            )}
        </div>
        {defaultModelId === model.id ? (
            <span className="flex items-center text-sm font-semibold text-green-400">
                <CheckIcon className="w-5 h-5 mr-1"/> 默认
            </span>
        ) : (
            <Button size="sm" variant="secondary" onClick={() => handleSetDefault(model.id)}>设为默认</Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">模型管理</h1>
        <Button onClick={() => handleOpenModal(null)}>
            <PlusIcon className="w-5 h-5 mr-2"/>
            添加自定义模型
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => <ModelCard key={model.id} model={model} />)}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingModel?.id && models.some(m => m.id === editingModel.id) ? '编辑模型' : '添加自定义模型'}>
        <div className="space-y-4">
          <Input label="模型昵称" value={editingModel?.nickname || ''} onChange={(e) => setEditingModel({...editingModel, nickname: e.target.value})} />
          
          {editingModel?.apiProvider !== ApiProvider.GEMINI ? (
              <Input label="API Key" type="password" placeholder="••••••••••" value={editingModel?.apiKey || ''} onChange={(e) => setEditingModel({...editingModel, apiKey: e.target.value})} />
          ) : (
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                  <p className="text-xs text-gray-400 bg-gray-900/50 p-3 rounded-md">对于 Gemini 模型，API 密钥通过服务器端代理安全处理，此处无需填写。</p>
              </div>
          )}

          {editingModel?.type === ModelProvider.CUSTOM && (
            <>
              <Input label="模型ID" placeholder="e.g., gpt-4o or remote model identifier" value={editingModel?.id || ''} onChange={(e) => setEditingModel({...editingModel, id: e.target.value})} />
              <Input label="Base URL (可选)" placeholder="https://api.example.com/v1" value={editingModel?.baseURL || ''} onChange={(e) => setEditingModel({...editingModel, baseURL: e.target.value})} />
            </>
          )}
          <Toggle label="Supports Web Search" enabled={editingModel?.supportsWebSearch || false} setEnabled={(enabled) => setEditingModel({...editingModel, supportsWebSearch: enabled})} />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={handleCloseModal}>取消</Button>
            <Button variant="primary" onClick={handleSaveModel}>保存模型</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelSettings;