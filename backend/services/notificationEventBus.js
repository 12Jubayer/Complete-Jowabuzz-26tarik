import { EventEmitter } from 'events';

const bus = new EventEmitter();
bus.setMaxListeners(0);

export function publishUserNotification(userId, payload) {
  bus.emit(`user:${userId}`, payload);
}

export function subscribeUserNotifications(userId, listener) {
  const channel = `user:${userId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}

export default bus;
