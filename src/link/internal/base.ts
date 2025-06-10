import { OperationResultEnvelope, TRPCClientError, TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import type { DataTransformerOptions } from '@trpc/server/unstable-core-do-not-import';

import { isTRPCResponse } from '../../shared/trpcMessage';
import type { MessengerMethods, TRPCChromeRequest } from '../../types';

export const createBaseLink = <TRouter extends AnyRouter>(
  methods: MessengerMethods,
  transformer?: DataTransformerOptions,
): TRPCLink<TRouter> => {
  return (runtime) => {
    return ({ op }) => {
      return observable((observer) => {
        const listeners: (() => void)[] = [];

        const { id, type, path } = op;

        try {
          // In tRPC v11, transformers are handled in links
          // Handle both CombinedDataTransformer and simple DataTransformer
          let input = op.input;
          if (transformer) {
            if ('input' in transformer) {
              // CombinedDataTransformer
              input = transformer.input.serialize(op.input);
            } else {
              // Simple DataTransformer
              input = transformer.serialize(op.input);
            }
          }

          const onDisconnect = () => {
            observer.error(new TRPCClientError('Port disconnected prematurely'));
          };

          methods.addCloseListener(onDisconnect);
          listeners.push(() => methods.removeCloseListener(onDisconnect));

          const onMessage = (message: unknown) => {
            if (!isTRPCResponse(message)) return;
            const { trpc } = message;
            if (id !== trpc.id) return;

            if ('error' in trpc) {
              return observer.error(TRPCClientError.from(trpc));
            }

            let data = trpc.result.data;
            if (transformer && (!trpc.result.type || trpc.result.type === 'data')) {
              if ('output' in transformer) {
                // CombinedDataTransformer
                data = transformer.output.deserialize(trpc.result.data);
              } else {
                // Simple DataTransformer
                data = transformer.deserialize(trpc.result.data);
              }
            }

            observer.next({
              result: {
                ...trpc.result,
                ...((!trpc.result.type || trpc.result.type === 'data') && {
                  type: 'data',
                  data,
                }),
              },
            } as OperationResultEnvelope<unknown, TRPCClientError<TRouter>>);

            if (type !== 'subscription' || trpc.result.type === 'stopped') {
              observer.complete();
            }
          };

          methods.addMessageListener(onMessage);
          listeners.push(() => methods.removeMessageListener(onMessage));

          methods.postMessage({
            trpc: {
              id,
              jsonrpc: undefined,
              method: type,
              // In tRPC v11, transformers are handled in links
              params: { path, input },
            },
          } as TRPCChromeRequest);
        } catch (cause) {
          observer.error(
            new TRPCClientError(cause instanceof Error ? cause.message : 'Unknown error'),
          );
        }

        return () => {
          if (type === 'subscription') {
            methods.postMessage({
              trpc: {
                id,
                jsonrpc: undefined,
                method: 'subscription.stop',
              },
            } as TRPCChromeRequest);
          }
          listeners.forEach((unsub) => unsub());
        };
      });
    };
  };
};
