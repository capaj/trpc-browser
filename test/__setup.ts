/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { vi } from 'vitest';
import type { MinimalPopupWindow, MinimalWindow } from '../src/types';

type OnMessageListener = (message: any) => void;
type OnConnectListener = (port: any) => void;

type ChromeType = typeof chrome;
export interface MockChrome extends ChromeType {
  __handlerPort: chrome.runtime.Port;
}

export const getMockChrome: () => MockChrome = vi.fn(() => {
  const linkPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnMessageListeners: OnMessageListener[] = [];
  const handlerPortOnConnectListeners: OnConnectListener[] = [];

  const handlerPort = {
    postMessage: vi.fn((message) => {
      linkPortOnMessageListeners.forEach((listener) => listener(message));
    }),
    onMessage: {
      addListener: vi.fn((listener) => {
        handlerPortOnMessageListeners.push(listener);
      }),
      removeListener: vi.fn((listener) => {
        const index = handlerPortOnMessageListeners.indexOf(listener);
        if (index > -1) {
          handlerPortOnMessageListeners.splice(index, 1);
        }
      }),
    },
    onDisconnect: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };

  return {
    __handlerPort: handlerPort,
    runtime: {
      connect: vi.fn(() => {
        const linkPort = {
          postMessage: vi.fn((message) => {
            handlerPortOnMessageListeners.forEach((listener) => listener(message));
          }),
          onMessage: {
            addListener: vi.fn((listener) => {
              linkPortOnMessageListeners.push(listener);
            }),
            removeListener: vi.fn((listener) => {
              const index = linkPortOnMessageListeners.indexOf(listener);
              if (index > -1) {
                linkPortOnMessageListeners.splice(index, 1);
              }
            }),
          },
          onDisconnect: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          },
        };

        handlerPortOnConnectListeners.forEach((listener) => listener(handlerPort));

        return linkPort;
      }),
      onConnect: {
        addListener: vi.fn((listener) => {
          handlerPortOnConnectListeners.push(listener);
        }),
      },
    },
  } as any;
});

export const getMockWindow = (postTo?: MinimalWindow): MinimalPopupWindow & MinimalWindow => {
  const listeners: ((event: MessageEvent) => void)[] = [];

  return {
    closed: false,
    addEventListener: vi.fn((event, listener: EventListener) => {
      if (event === 'load') {
        setTimeout(() => {
          listener({} as any);
        }, 100);
      }
      if (event !== 'message') return;
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((event, listener: EventListener) => {
      if (event !== 'message') return;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    postMessage: vi.fn((message) => {
      listeners.forEach((listener) => listener({ data: message } as MessageEvent));
      postTo?.postMessage(message);
    }),
  };
};
