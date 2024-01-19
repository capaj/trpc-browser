import { createTRPCProxyClient } from '@trpc/client';

import { popupLink } from '../../../link/popup';
import { windowLink } from '../../../link/window';
import type { AppRouter } from './trpcListener';

const REMOTE_ORIGIN = process.env.NEXT_PUBLIC_REMOTE_ORIGIN;

export function getTrpcClientIframe(iframe: Window) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      windowLink({
        window: window,
        postWindow: iframe,
        postOrigin: REMOTE_ORIGIN,
      }),
    ],
  });
}

export const popupUrl = `${REMOTE_ORIGIN || ''}/example/popup/popup`;

export function getTrpcClientPopup() {
  return createTRPCProxyClient<AppRouter>({
    links: [
      popupLink({
        listenWindow: window,
        createPopup: () => {
          const w = window.open(popupUrl, 'popup', 'width=680,height=520');
          if (!w) {
            throw new Error('Could not open popup');
          }
          return w;
        },
        postOrigin: REMOTE_ORIGIN,
      }),
    ],
  });
}
