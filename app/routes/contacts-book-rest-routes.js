// Добавление пользователей - POST-запрос с телом:
// x-www-form-urlencoded и обязательными полями
// firstname, surename и phone.
// URL-пример запроса: http://localhost:3000/api/v1/contacts

// Список всех контактов - GET-запрос без параметров
// URL-пример запроса: http://localhost:3000/api/v1/contacts

// Поиск контактов - GET-запрос с queryString параметрами
// ГКД-пример запроса: http://localhost:3000/api/v1/contacts?firstname=Sergei

// Редактирование пользователя - PUT-запрос по ID контакта
// Передача обновляемых значений идёт через queryString
// Если параметр обновления не найден, он будет создан
// URL-пример запроса: http://localhost:3000/api/v1/contacts/:id?superpower=long%20sleep

// Удаление контакта - DELETE-запрос по ID контакта
// ID используются не системные, а кастомные, которые
// раздаются при добавлении пользователя
// URL-пример запроса: http://localhost:3000/api/v1/contacts/:id

const contactsBookApiPath = '/api/v1/contacts';

module.exports = (app, db) => {
  const contactsCollection = db.collection('contacts');

  app.post(contactsBookApiPath, (req, res) => {
    try {
      const newUser = {
        // Очистка пробельных символов из параметров запроса
        firstname: (req.body.firstname) ? req.body.firstname.trim() : undefined,
        surename: (req.body.surename) ? req.body.surename.trim() : undefined,
        phone: (req.body.phone) ? formatingPhone(req.body.phone) : undefined
      };

      // Проверка полей на заполнение
      if (Object.keys(newUser).some(field => !newUser[field])) {
        return sendNotValidRequest(res);
      }

      // В чейнинге промисов используется отдельный catch, из-за предупреждения Node.js:
      // In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
      contactsCollection.find({}).toArray()
        .then(contactsList => {
          // Определяем самый высокий id
          const highestId = contactsList.reduce((highestId, contact) => {
            return (highestId < contact.id) ? contact.id : highestId;
          }, 0);

          newUser.id = 1 + highestId;
          return contactsCollection.insertOne(newUser);
        })
        .then(result => {
          // Обрабатываем результат добавления
          const addedContact = result.ops[0];
          res.send(addedContact);
        })
        .catch(err => sendServerError(err, res));

    } catch (e) {
      return sendServerError(e, res);
    }
  });

  app.get(contactsBookApiPath, (req, res) => {
    try {
      // Поиск по разным полям в БД организован с помощью простой
      // обработки queryString параметров, в качестве поискового указателя
      // по Базе данных
      const searchParams = req.query;

      contactsCollection.find(searchParams, {_id: 0}).toArray()
        .then(contactsList => {
          if (contactsList.length <= 0) {
            return sendNotFound(res);
          }
          res.send(contactsList);
        })
        .catch(err => sendServerError(err, res))

    } catch (e) {
      return sendServerError(e, res);
    }
  });

  app.get(contactsBookApiPath + '/:id', (req, res) => {
    try {
      const contactId = Number(req.params.id);

      if (!contactId) {
        return sendNotValidRequest(res);
      }

      const searchablePointer = {id: contactId};
      contactsCollection.findOne(searchablePointer, {_id: 0})
        .then(contact => {
          if (!contact) {
            return sendNotFound(res);
          }
          res.send(contact);
        })
        .catch(err => sendServerError(err, res));

    } catch (e) {
      return sendServerError(e, res);
    }
  });

  app.get(contactsBookApiPath + '/:id' + '/:prop', (req, res) => {
    try {
      const contactId = Number(req.params.id);
      const contactProp = req.params.prop;

      if ([contactId, contactProp].some(field => !field)) {
        return sendNotValidRequest(res);
      }

      const searchablePointer = {
        $and: [
          {id: contactId},
          {[contactProp]:
            {$exists: true} // Если указанное поле существует
          }
        ]
      };

      contactsCollection.findOne(searchablePointer, {_id: 0})
        .then(contact => {
          if (!contact) {
            return sendNotFound(res);
          }
          res.send(contact[contactProp]);
        })
        .catch(err => sendServerError(err, res));

    } catch (e) {
      return sendServerError(e, res);
    }
  });

  app.put(contactsBookApiPath + '/:id', (req, res) => {
    try {
      const contactId = Number(req.params.id);
      const updatableParams = req.query;

      // Проверка переданных параметров
      if (!contactId || Object.keys(updatableParams).length === 0) {
        return sendNotValidRequest(res);
      }

      const searchablePointer = {id: contactId};
      contactsCollection.findOne(searchablePointer)
        .then(contact => {
          if (!contact) {
            return sendNotFound(res);
          }

          // Обновление всех значений из параметров запроса
          const updatedContact = Object.assign({}, contact);
          Object.keys(updatableParams).forEach(key => {
            updatedContact[key] = updatableParams[key];
          });

          return contactsCollection.findOneAndUpdate(contact, updatedContact)
        })
        .then(info => {
          res.send(`User ID:${contactId} updated`);
        })
        .catch(err => sendServerError(err, res));

    } catch (e) {
      return sendServerError(e, res);
    }
  });

  app.delete(contactsBookApiPath + '/:id', (req, res) => {
    try {
      const contactId = Number(req.params.id);

      if (!contactId) {
        return sendNotValidRequest(res);
      }

      const searchablePointer = {id: contactId};
      contactsCollection.remove(searchablePointer)
        .then(commandResult => {
          // Если ничего не удалено, то commandResult.result.n === 0
          if (!commandResult.result.n) {
            return sendNotFound(res);
          }
          res.send(`User ID:${contactId} deleted!`);
        })
        .catch(err => sendServerError(err, res));

    } catch (e) {
      return sendServerError(e, res);
    }
  });
};


// States handling
function sendNotValidRequest(response) {
  response.statusCode = 400;
  response.send('Not valid request');
  return false;
}

function sendNotFound(response) {
  response.statusCode = 404;
  response.send('Not found');
  return false;
}

function sendServerError(error, response) {
  console.error(error);
  response.statusCode = 500;
  response.send('Internal server error');
  return false;
}

function formatingPhone(phoneNumber) {
  return phoneNumber.trim().replace(/\D+/g, '');
}