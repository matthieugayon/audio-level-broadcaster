/// <reference lib="webworker" />

interface Events {
  id: string;
  buffer: ArrayBuffer;
}

/**
 * Shared worker
 * Used to enable communication between browsing contexts
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _self: SharedWorkerGlobalScope = self as any;

const ports: MessagePort[] = [];

_self.onconnect = function (e) {
  const port = e.ports[0];

  ports.push(port);

  port.addEventListener('message', function (message: MessageEvent<Events>) {
    ports.forEach(port => {
      port.postMessage(message.data);
    });
  });

  port.start();
};