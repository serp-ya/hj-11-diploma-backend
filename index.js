const MongoClient     = require('mongodb').MongoClient;
const http            = require('http');
const express         = require('express');
const bodyParser      = require('body-parser');
const session         = require('express-session');
const cors            = require('cors');
const app             = express();
// Конфигурации сервера и базы данных
const dbUrl          = require('./config/db.conf').url;
const serverPort     = require('./config/server.conf').port;
const oneYearMilliseconds =  1000 * 60 * 60 * 24 * 365;

// Middleware для обработки тела запросов
app.use(bodyParser.urlencoded({"extended": true}));
app.use(bodyParser.json());

// Middleware для CORS
const corsOptions = {
  origin: 'https://serp-ya.github.io',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));

// Middleware для работы с сессиями
app.use(session({
  name: 'hj.sid',
  secret: 'store cart session',
  cookie: {
    maxAge: oneYearMilliseconds,
    secure: 'auto'
  }
}));

// Подключение базы данных
MongoClient.connect(dbUrl)
  .then(db => {
    const server = http.createServer(app);
    server.listen(serverPort, () => {
      console.log(`The server is running on port ${serverPort}`);
    });

    // Подключаем роуты приложения в процедурном стиле
    require('./app/routes')(app, db);

    // WebSocket-интерфейс
    require('./app/WebSocket')({server: server});

  })
  .catch(console.error);
