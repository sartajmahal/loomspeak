import React, { useState } from 'react';

interface RovoCommandInputProps {
  onCommandSubmit: (command: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const RovoCommandInput: React.FC<RovoCommandInputProps> = ({ 
  onCommandSubmit, 
  isLoading = false,
  placeholder = "Hey Rovo, summarize key points of my lecture and put into a confluence page located in my CSE 312 workspace"
}) => {
  const [command, setCommand] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isLoading) {
      onCommandSubmit(command.trim());
      setCommand('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  // Example commands for quick access
  const exampleCommands = [
    "Create a Jira ticket for homework assignment due next Friday",
    "Summarize lecture notes and create a Confluence page",
    "Find all assignments in my CSE 312 workspace",
    "Create a task for reviewing probability concepts"
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-gray-900">
            Rovo AI Assistant
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Use natural language to interact with your workspace
        </p>
      </div>

      {/* Command Input */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className={`relative border-2 rounded-lg transition-colors duration-200 ${
          isFocused ? 'border-blue-500' : 'border-gray-300'
        }`}>
          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full p-4 pr-12 border-0 rounded-lg resize-none focus:ring-0 focus:outline-none text-sm"
            rows={3}
          />
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={!command.trim() || isLoading}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Example Commands */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Example Commands
        </p>
        <div className="grid grid-cols-1 gap-2">
          {exampleCommands.map((example, index) => (
            <button
              key={index}
              onClick={() => setCommand(example)}
              disabled={isLoading}
              className="text-left p-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200 disabled:opacity-50"
            >
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <span>{example}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rovo Features */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>Jira Integration</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            </svg>
            <span>Confluence Pages</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"/>
            </svg>
            <span>Smart Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RovoCommandInput;
