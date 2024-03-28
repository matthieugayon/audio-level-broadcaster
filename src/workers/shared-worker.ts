/// <reference lib="webworker" />
const _self: SharedWorkerGlobalScope = self as any;

const ports: MessagePort[] = [];

_self.onconnect = function (e) {
  const port = e.ports[0];

  ports.push(port);

  port.addEventListener("message", function (message) {
    ports.forEach(port => {
      port.postMessage(message.data);
    });
  });

  port.start();
};