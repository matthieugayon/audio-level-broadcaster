/// <reference lib="webworker" />

/**
 * Shared worker
 * Used to enable communication between browsing contexts
 */

const _self: SharedWorkerGlobalScope = self as any;

const ports: MessagePort[] = [];

_self.onconnect = function (e) {
  const port = e.ports[0];

  ports.push(port);

  console.log("New client", port);

  port.addEventListener("message", function (message) {
    console.log("Shared worker received message", message);

    ports.forEach(port => {
      port.postMessage(message.data);
    });
  });

  port.start();
};