const usersCartRestRoutes = require('./users-cart-rest-routes');
const goodsRestRoutes = require('./goods-rest-routes');

module.exports = (app, db) => {
  usersCartRestRoutes(app, db);
  goodsRestRoutes(app, db);
};