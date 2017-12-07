const WebSocketServer = require("ws").Server;
const webSocketUsersIds = [0];

module.exports = (config) => {
  const wss = new WebSocketServer(config);
  wss.on("connection", function (ws) {
    const wsId = 1 + Math.max(...webSocketUsersIds);
    webSocketUsersIds.push(wsId);
    ws.currentId = wsId;

    wss.clients.forEach(client => {
      // Отправляем админу новый чат
      if (client.isAdmin) {
        const adminNotification = {
          eventId: 'newСonnection',
          message: `Чат с пользователем ID${ws.currentId}!`,
          clientId: ws.currentId,
          connectionsCount: wss.clients.size
        };

        client.send(JSON.stringify(adminNotification));
      }
    });

    ws.on('message', function (incomingMessage) {
      const incomingData = JSON.parse(incomingMessage);

      if (incomingData.setIsAdmin) {
        ws.isAdmin = true;
      }

      // Если админ отвечает пользователю
      if (ws.isAdmin && incomingData.targetId) {
        const targetId = incomingData.targetId;
        const replyMessage = {};

        if (incomingData.eventId === 'startTyping') {
          replyMessage.eventId = 'startTyping';

        } else if (incomingData.eventId === 'stopTyping') {
          replyMessage.eventId = 'stopTyping';

        } else {
          replyMessage.eventId = 'incomingMessage';
          replyMessage.message = incomingData.message;

        }

        wss.clients.forEach(client => {
          if (client.currentId === targetId) {
            client.send(JSON.stringify(replyMessage));
          }
        });

      // Если сообщение приходит НЕ от админа
      } else if (!ws.isAdmin ) {
        const replyMessage = {currentId: ws.currentId};

        if (incomingData.eventId === 'startTyping') {
          replyMessage.eventId = 'startTyping';

        } else if (incomingData.eventId === 'stopTyping') {
          replyMessage.eventId = 'stopTyping';

        } else {
          replyMessage.eventId = 'incomingMessage';
          replyMessage.message = incomingData.message;

        }

        let adminIsOnline = false;

        wss.clients.forEach(client => {
          if (client.isAdmin) {
            client.send(JSON.stringify(replyMessage));
            adminIsOnline = true;
          }
        });

        replyMessage.message = 'Сожалеем, но администраторов нет онлайн, заходите позже или пишите на почту';
        
        if (!adminIsOnline) {
          ws.send(
            JSON.stringify(replyMessage)
          );
        }
      }
    });

    ws.on("close", function() {
      wss.clients.forEach(client => {
        if (client.isAdmin) {
          const adminNotification = {
            eventId: 'closeСonnection',
            message: `Чат с пользователем ID${ws.currentId} завершён!`,
            targetId: ws.currentId,
            connectionsCount: wss.clients.size
          };
          client.send(JSON.stringify(adminNotification));
        }
      });
    });

  });

};