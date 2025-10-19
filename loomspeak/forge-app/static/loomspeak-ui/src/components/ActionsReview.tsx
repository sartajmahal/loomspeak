import React, { useState } from 'react';

interface Action {
  action: 'create_issue' | 'create_page';
  title: string;
  description?: string;
  project?: string;
  points?: number;
  assignee?: string;
  dueDate?: string;
  spaceKey?: string;
  pageParentId?: string;
  bodyHtml?: string;
  confidence?: number;
}

interface ActionsReviewProps {
  actions: Action[];
  onConfirm: (actions: Action[]) => void;
  onEdit: (index: number, action: Action) => void;
}

export function ActionsReview({ actions, onConfirm, onEdit }: ActionsReviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedActions, setEditedActions] = useState<Action[]>(actions);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSave = (index: number) => {
    setEditingIndex(null);
    onEdit(index, editedActions[index]);
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedActions(actions);
  };

  const handleFieldChange = (index: number, field: keyof Action, value: any) => {
    setEditedActions(prev => prev.map((action, i) => 
      i === index ? { ...action, [field]: value } : action
    ));
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-200';
    if (confidence >= 0.8) return 'bg-green-200';
    if (confidence >= 0.6) return 'bg-yellow-200';
    return 'bg-red-200';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Detected Actions</h3>
      
      {editedActions.map((action, index) => (
        <div key={index} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">
                {action.action === 'create_issue' ? 'Jira Issue' : 'Confluence Page'}
              </span>
              {action.confidence !== undefined && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(action.confidence)}`}>
                  {getConfidenceText(action.confidence)} Confidence
                </span>
              )}
            </div>
            
            {editingIndex !== index && (
              <button
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                onClick={() => handleEdit(index)}
              >
                Edit
              </button>
            )}
          </div>

          {editingIndex === index ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={action.title}
                  onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={action.description || ''}
                  onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {action.action === 'create_issue' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project
                      </label>
                      <input
                        type="text"
                        value={action.project || ''}
                        onChange={(e) => handleFieldChange(index, 'project', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ENG"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Story Points
                      </label>
                      <input
                        type="number"
                        value={action.points || ''}
                        onChange={(e) => handleFieldChange(index, 'points', parseInt(e.target.value) || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assignee (Email)
                      </label>
                      <input
                        type="email"
                        value={action.assignee || ''}
                        onChange={(e) => handleFieldChange(index, 'assignee', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <input
                        type="text"
                        value={action.dueDate || ''}
                        onChange={(e) => handleFieldChange(index, 'dueDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Friday, Tomorrow, etc."
                      />
                    </div>
                  </div>
                </>
              )}

              {action.action === 'create_page' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Space Key
                    </label>
                    <input
                      type="text"
                      value={action.spaceKey || ''}
                      onChange={(e) => handleFieldChange(index, 'spaceKey', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DOC"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Page ID
                    </label>
                    <input
                      type="text"
                      value={action.pageParentId || ''}
                      onChange={(e) => handleFieldChange(index, 'pageParentId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-medium"
                  onClick={() => handleSave(index)}
                >
                  Save
                </button>
                <button
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded font-medium"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">{action.title}</h4>
              {action.description && (
                <p className="text-sm text-gray-600">{action.description}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                {action.project && <span>Project: {action.project}</span>}
                {action.points && <span>Points: {action.points}</span>}
                {action.assignee && <span>Assignee: {action.assignee}</span>}
                {action.dueDate && <span>Due: {action.dueDate}</span>}
                {action.spaceKey && <span>Space: {action.spaceKey}</span>}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-3">
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded font-medium"
          onClick={() => onConfirm(editedActions)}
        >
          Create All Items
        </button>
        
        <button
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded font-medium"
          onClick={() => onConfirm([])}
        >
          Skip All
        </button>
      </div>
    </div>
  );
}
