"use client";

import * as React from 'react';
import { useSpeechRecognition } from './use-speech-recognition';

interface VoiceCommand {
  command: string;
  keywords: string[];
  action: () => void;
}

interface UseVoiceCommandsOptions {
  commands: VoiceCommand[];
  onCommandRecognized?: (command: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions) {
  const { commands, onCommandRecognized, onError, enabled = true } = options;
  const [isCommandMode, setIsCommandMode] = React.useState(false);
  const [lastCommand, setLastCommand] = React.useState<string>('');

  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    onResult: (result) => {
      if (result.isFinal && enabled) {
        const recognizedText = result.transcript.toLowerCase().trim();
        
        // 检查是否匹配任何命令
        for (const command of commands) {
          const isMatch = command.keywords.some(keyword => 
            recognizedText.includes(keyword.toLowerCase())
          );
          
          if (isMatch) {
            setLastCommand(command.command);
            onCommandRecognized?.(command.command);
            command.action();
            
            // 执行命令后停止监听
            setTimeout(() => {
              stopListening();
              setIsCommandMode(false);
            }, 500);
            break;
          }
        }
      }
    },
    onError: (error) => {
      onError?.(error);
      setIsCommandMode(false);
    },
    onStart: () => {
      setIsCommandMode(true);
    },
    onEnd: () => {
      setIsCommandMode(false);
    },
    continuous: false,
    language: 'zh-CN'
  });

  const startCommandListening = React.useCallback(() => {
    if (!enabled || !isSupported) {
      onError?.('浏览器不支持语音识别功能');
      return;
    }

    resetTranscript();
    setLastCommand('');
    startListening();
  }, [enabled, isSupported, resetTranscript, startListening, onError]);

  const stopCommandListening = React.useCallback(() => {
    stopListening();
    setIsCommandMode(false);
  }, [stopListening]);

  return {
    isCommandMode,
    isListening,
    isSupported,
    lastCommand,
    transcript,
    startCommandListening,
    stopCommandListening
  };
} 