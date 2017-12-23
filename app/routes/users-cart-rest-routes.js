const usersCartApiPath = '/api/v1/carts';

module.exports = (app, db) => {
  const usersCartCollection = db.collection('cartSessions');
  const goodsCollection = db.collection('goods');

  app.get(usersCartApiPath, (req, res) => {
    try {
      const queryParams = req.query;
      const sessionId = req.session.id;
      const sessionIdSelector = {'_id': sessionId};

      (async function() {
        let cart = await usersCartCollection.findOne(sessionIdSelector, {'_id': 0});
        cart = cart ? cart : {};

        if (queryParams.count) {
          let productsCount;
          if (Array.isArray(cart.goods)) {
            productsCount = cart.goods.reduce((result, good) => {
              return result += good.count;
            }, 0);
          } else {
            productsCount = 0;
          }
          return res.send({message: 'User count goods in cart ', count: productsCount});
        }

        return res.send({message: 'User cart', cart: cart});
      })();

    } catch (error) {
      sendServerError(error, res);
    }
  });
  
  app.post(usersCartApiPath, (req, res) => {
    try {
      const newGoodId = {'_id': Number(req.body['_id'])};
      const sessionId = req.session.id;
      const sessionIdSelector = {'_id': sessionId};

      if (!(newGoodId['_id'])) {
        return sendNotValidRequest(res);
      }
      
      (async function() {
        const sessionExist = await usersCartCollection.count(sessionIdSelector);
        const newGood = await goodsCollection.findOne(newGoodId);
        const cartHaveThatGood = await usersCartCollection.find({
          '_id': sessionId,
          'goods': {$elemMatch: {
            '_id':  newGood['_id']
          }}
        },
        {
          '_id': 0,
          'goods.count': 1
        }).toArray();

        if (!sessionExist && !cartHaveThatGood.length) {
          newGood.count = 1;
          res.send({
            message: 'Cart after adding good',
            addedGood: newGood,
            cart: {'goods': [newGood]}
          });
          return usersCartCollection.insertOne({'_id': sessionId, "goods": [newGood]});
        }

        const oldDataArray = await usersCartCollection.findOne(sessionIdSelector);
        const cartData = oldDataArray.goods;
        const indexOfIncomingGood = cartData.findIndex(good => good['_id'] === newGood['_id']);

        if (indexOfIncomingGood !== -1) {
          cartData[indexOfIncomingGood].count++;
        } else {
          newGood.count = 1;
          cartData.push(newGood);
        }

        usersCartCollection.findOneAndUpdate(sessionIdSelector, {$set: {"goods": cartData}});
        res.send({
          message: 'Cart after adding good',
          addedGood: newGood,
          cart: cartData
        });
      })();
    } catch (e) {
      sendServerError(e, res);
    }
  });

  app.put(usersCartApiPath, (req, res) => {
    try {
      const updatableGood = req.body;
      const sessionId = req.session.id;
      const sessionIdSelector = {'_id': sessionId};

      if (!updatableGood['_id'] || !updatableGood['count']) {
        sendNotValidRequest(res);
      }

      (async function() {
        const oldDataArray = await usersCartCollection.findOne(sessionIdSelector);
        const cartData = oldDataArray.goods;
        const indexOfUpdatableGood = cartData.findIndex(good => good['_id'] == updatableGood['_id']);

        cartData[indexOfUpdatableGood].count = updatableGood.count;
        usersCartCollection.findOneAndUpdate(sessionIdSelector, {$set: {"goods": cartData}});

        res.send({
          message: `Product by id${updatableGood['_id']} count update`,
          updatedCart: cartData
        });
      })();

    } catch (error) {
      sendServerError(error, res)
    }
  });

  app.delete(usersCartApiPath, (req, res) => {
    try {
      const deletableGood = req.body;
      const sessionId = req.session.id;
      const sessionIdSelector = {'_id': sessionId};
      const deleteParams = req.query;

      if (Object.keys(deletableGood).length) {
        (async function() {

          const oldDataArray = await usersCartCollection.findOne(sessionIdSelector);

          if (!oldDataArray) {
            return sendNotFound(res);
          }

          const cartData = oldDataArray.goods;
          const indexOfIncomingGood = cartData.findIndex(good => good['_id'] == deletableGood['_id']);

          if (deleteParams.all) {
            cartData.splice(0);
          } else if (indexOfIncomingGood !== -1) {
            cartData.splice(indexOfIncomingGood, 1);
          } else {
            return sendNotFound(res);
          }

          usersCartCollection.findOneAndUpdate(sessionIdSelector, {$set: {"goods": cartData}});
          res.send({message: 'Cart after deleting', cart: cartData});
        })();
      }
    } catch (e) {
      sendServerError(e, res);
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