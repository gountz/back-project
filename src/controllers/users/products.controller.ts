import { Request, Response, Router } from 'express';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class ProductController
  extends AuthMiddleware
  implements Controller
{
  path = '/api-rest/products';
  router = Router();
  private db = this.client;

  constructor() {
    super();
    this.initRoutes();
  }

  initRoutes(): void {
    this.router.get(this.path, this.get);
    this.router.get(this.path + '/:id', this.getId);
  }

  private get = async (req: Request, res: Response) => {
    const { limit = 10, offset = 0 } = req.query;
    let query = {
      text: 'SELECT * FROM products WHERE is_active = $1 and stock > $2 LIMIT $3 OFFSET $4;',
      values: [true, 0, limit, offset],
    };
    const products = await this.db.query(query);
    query = { text: 'SELECT * FROM categories;', values: [] };
    const categories = await this.db.query(query);
    query = { text: 'SELECT * FROM subcategories;', values: [] };
    const subcategories = await this.db.query(query);
    const response = products.rows.map((product) => {
      const category = categories.rows.find(
        (ctg) => ctg.id_category === product.id_category
      );
      const subcategory = subcategories.rows.find(
        (subctg) => subctg.id_subcategory === product.id_subcategory
      );
      return {
        id: product.id_product,
        category: { name: category.title },
        subcategory: {
          name: subcategory.title,
        },
        title: product.title,
        thumbnail: product.thumbnail,
        image_one: product.image_one,
        image_two: product.image_two,
        image_three: product.image_three,
        image_four: product.image_four,
        description: product.description,
        colors: product.colors?.split(' '),
        size: product.size.split(' '),
        price: product.price,
      };
    });
    return res.status(201).json({ products: response });
  };

  private getId = async (req: Request, res: Response) => {
    const { id } = req.params;
    let query = {
      text: 'SELECT * FROM products WHERE id_product = $1 AND is_active = $2 AND stock > $3;',
      values: [Number(id), true, 0],
    };
    const product = await this.db.query(query);
    if (!product.rows[0]) {
      return res.status(406).json({ error: ['Product not exist'] });
    } else {
      query = {
        text: 'SELECT * FROM categories WHERE id_category = $1',
        values: [product.rows[0].id_category],
      };
      const category = await this.db.query(query);
      query = {
        text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
        values: [product.rows[0].id_subcategory],
      };
      const subcategory = await this.db.query(query);
      const response = product.rows.map((prd) => {
        return {
          id: prd.id_product,
          category: {
            name: category.rows[0].title,
          },
          subcategory: {
            name: subcategory.rows[0].title,
          },
          title: prd.title,
          thumbnail: prd.thumbnail,
          image_one: prd.image_one,
          image_two: prd.image_two,
          image_three: prd.image_three,
          image_four: prd.image_four,
          description: prd.description,
          colors: prd.colors?.split(' '),
          size: prd.size.split(' '),
          price: prd.price,
        };
      });
      return res.status(201).json({ product: response[0] });
    }
  };
}
