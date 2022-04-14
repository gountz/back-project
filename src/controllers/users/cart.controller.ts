import { Request, Response, Router } from 'express';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class CartController
  extends AuthMiddleware
  implements Controller
{
  path = '/api-rest/cart';
  router = Router();
  private db = this.client;

  constructor() {
    super();
    this.initRoutes();
  }

  initRoutes(): void {
    this.router.get(this.path, this.tokenVerify, this.getCart);
    this.router.post(this.path + 'product/:id', this.tokenVerify, this.add);
    this.router.delete(
      this.path + 'product/:id',
      this.tokenVerify,
      this.remove
    );
  }

  private getCart = async (req: Request, res: Response) => {
    const accessToken = req.headers['authorization'];
    let { user, error } = await this.verifyToken(accessToken);
    let query = {
      text: 'SELECT id_user FROM users WHERE email = $1',
      values: [user.email],
    };
    user = await this.db.query(query);
    query = {
      text: 'SELECT id_cart FROM carts WHERE id_user = $1',
      values: [user.rows[0].id_user],
    };
    const cart = await this.db.query(query);
    if (!cart.rows[0]) {
      await this.newCart(user.rows[0].id_user);
      return res.status(200).json({ cart: [] });
    }
    query = {
      text: 'SELECT * FROM cart_products WHERE id_cart = $1',
      values: [cart.rows[0].id_cart],
    };
    const products = await this.db.query(query);
    const response = products.rows.map((product) => {
      return {
        title: product.title,
        quantity: product.quantity,
        size: product.size,
        color: product.color,
        price: product.price,
      };
    });
    return res.status(201).json({ cart: response });
  };

  private add = async (req: Request, res: Response) => {
    const accessToken = req.headers['authorization'];
    const { id } = req.params;
    const { size, color } = req.body.product;
    let { user } = await this.verifyToken(accessToken);
    let query = {
      text: 'SELECT id_user FROM users WHERE email = $1',
      values: [user.email],
    };
    user = await this.db.query(query);
    query = {
      text: 'SELECT id_cart FROM carts WHERE id_user = $1',
      values: [user.rows[0].id_user],
    };
    let cart = await this.db.query(query);
    if (!cart.rows[0]) {
      cart = await this.newCart(user.rows[0].id_user);
    }
    query = {
      text: 'SELECT title, price FROM products WHERE id_product = $1;',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Error Data'] });
    query = {
      text: 'SELECT * FROM cart_products WHERE id_cart = $1 AND id_product = $2 AND size_select = $3 AND color = $4;',
      values: [cart.rows[0].id_cart, product.rows[0].id_product, size, color],
    };
    const cartProduct = await this.db.query(query);
    if (!cartProduct.rows[0]) {
      query = {
        text: 'INSERT INTO cart_products (id_cart, id_product, title, quantity, size_select, color, price) VALUES($1, $2, $3, $4, $5, $6, $7);',
        values: [
          cart.rows[0].id_cart,
          product.rows[0].id_product,
          product.rows[0].title,
          0,
          size,
          color,
          product.rows[0].price,
        ],
      };
      await this.db.query(query);
      query = {
        text: 'SELECT * FROM cart_products WHERE id_cart = $1 AND id_product = $2 AND size_select = $3 AND color = $4;',
        values: [cart.rows[0].id_cart, product.rows[0].id_product, size, color],
      };
      const newCartProduct = await this.db.query(query);
      return res.status(201).json({
        product: {
          title: newCartProduct.rows[0].title,
          quantity: newCartProduct.rows[0].quantity,
          size: newCartProduct.rows[0].size,
          color: newCartProduct.rows[0].color,
          price: newCartProduct.rows[0].price,
        },
      });
    } else {
      query = {
        text: 'UPDATE set quantity = $1, price = $2 WHERE id_cart_product = $3;',
        values: [
          cartProduct.rows[0].quantity + 1,
          cartProduct.rows[0].price * (cartProduct.rows[0].quantity + 1),
          cartProduct.rows[0].id_cart_product,
        ],
      };
      await this.db.query(query);
      query = {
        text: 'SELECT * FROM cart_products WHERE id_cart = $1 AND id_product = $2 AND size_select = $3 AND color = $4;',
        values: [cart.rows[0].id_cart, product.rows[0].id_product, size, color],
      };
      const newCartProduct = await this.db.query(query);
      return res.status(201).json({
        product: {
          title: newCartProduct.rows[0].title,
          quantity: newCartProduct.rows[0].quantity,
          size: newCartProduct.rows[0].size,
          color: newCartProduct.rows[0].color,
          price: newCartProduct.rows[0].price,
        },
      });
    }
  };

  private remove = async (req: Request, res: Response) => {
    const accessToken = req.headers['authorization'];
    const { id } = req.params;
    const { size, color } = req.body.product;
    let { user, error } = await this.verifyToken(accessToken);
    let query = {
      text: 'SELECT id_user FROM users WHERE email = $1',
      values: [user.email],
    };
    user = await this.db.query(query);
    query = {
      text: 'SELECT id_cart FROM carts WHERE id_user = $1',
      values: [user.rows[0].id_user],
    };
    const cart = await this.db.query(query);
    query = {
      text: 'SELECT title, price FROM products WHERE id_product = $1;',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Error Data'] });
    query = {
      text: 'SELECT * FROM cart_products WHERE id_cart = $1 AND id_product = $2 AND size_select = $3 AND color = $4;',
      values: [cart.rows[0].id_cart, product.rows[0].id_product, size, color],
    };
    const cartProduct = await this.db.query(query);
    if (!cartProduct.rows[0]) {
      res.status(406).json({ error: ['Error Data'] });
    } else {
      if (cartProduct.rows[0].quantity > 1) {
        query = {
          text: 'UPDATE set quantity = $1, price = $2 WHERE id_cart_product = $3;',
          values: [
            cartProduct.rows[0].quantity - 1,
            cartProduct.rows[0].price * (cartProduct.rows[0].quantity - 1),
            cartProduct.rows[0].id_cart_product,
          ],
        };
        await this.db.query(query);
        query = {
          text: 'SELECT * FROM cart_products WHERE id_cart = $1 AND id_product = $2 AND size_select = $3 AND color = $4;',
          values: [
            cart.rows[0].id_cart,
            product.rows[0].id_product,
            size,
            color,
          ],
        };
        const newCartProduct = await this.db.query(query);
        return res.status(201).json({
          product: {
            title: newCartProduct.rows[0].title,
            quantity: newCartProduct.rows[0].quantity,
            size: newCartProduct.rows[0].size,
            color: newCartProduct.rows[0].color,
            price: newCartProduct.rows[0].price,
          },
        });
      } else {
        query = {
          text: 'DELETE FROM cart_products WHERE id_cart_product = $1;',
          values: [cartProduct.rows[0].id_cart_product],
        };
        await this.db
          .query(query)
          .then(() => res.status(200).send())
          .catch((err) => {
            return res.status(406).json({ error: [err.code] });
          });
      }
    }
  };

  private newCart = async (user: number) => {
    let query = {
      text: 'INSERT INTO carts (id_user, cart_date) VALUES ($1, $2);',
      values: [user, new Date(Date.now()).toISOString()],
    };
    await this.db.query(query);
    query = {
      text: 'SELECT * FROM carts WHERE id_user = $1',
      values: [user],
    };
    return await this.db.query(query);
  };
}
