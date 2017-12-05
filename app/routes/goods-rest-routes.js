const goodsApiPath = '/api/v1/goods';

module.exports = (app, db) => {
  const goodsCollection = db.collection('goods');

  app.get(goodsApiPath, (req, res) => {
    try {
      const queryParams = req.query;

      if (!queryParams.limit) {
        queryParams.limit = 6;
      } else if (typeof queryParams.limit !== 'number') {
        queryParams.limit = Number(queryParams.limit);
      }

      if (!queryParams.offset) {
        queryParams.offset = 0;
      } else if (typeof queryParams.offset !== 'number') {
        queryParams.offset = Number(queryParams.offset);
      }

      (async function() {
        if (queryParams.search) {
          const searchResult = await goodsCollection.find({
            $text: {
              $search: queryParams.search,
              $caseSensitive: false,
              $diacriticSensitive: false
            }
          }).toArray();

          return res.send(searchResult);

        } else if (queryParams.count) {
          const goodsCount = await goodsCollection.count();

          return res.send(JSON.stringify(goodsCount));
        }

        const replyCursor = goodsCollection.find({});
        replyCursor.skip(queryParams.offset);
        replyCursor.limit(queryParams.limit);

        let replyData = await replyCursor.toArray();

        return res.send(replyData);
      })();
    } catch (error) {
      sendServerError(error, res);
    }
  });

  app.get(goodsApiPath + '/:goodId', (req, res) => {
    try {
      const goodId = Number(req.params.goodId);

      if (!goodId) {
        return sendNotValidRequest(res);
      }

      const searchPointer = {"_id": goodId};

      (async function () {
        const wantedItem = await goodsCollection.findOne(searchPointer);

        if (!wantedItem) {
          return sendNotValidRequest(res);
        }

        return res.send(wantedItem);
      })();

    } catch (error) {
      sendServerError(error, res);
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