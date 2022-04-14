import { Request, Response, Router } from 'express';
import multer from 'multer';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class ProductAdminController
  extends AuthMiddleware
  implements Controller
{
  path = '/admin/api-rest';
  router = Router();
  private db = this.client;
  private storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'src/media/img/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + file.originalname.replace(/ /g, ''));
    },
  });

  private upload = multer({
    storage: this.storage,
    limits: { fileSize: 1024 * 1024 * 5 },
  });

  constructor() {
    super();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      this.path + '/config/products',
      this.authVerify,
      this.getProducts
    );
    this.router.get(
      this.path + '/config/products/filter/:name',
      this.authVerify,
      this.getProductsFilter
    );
    this.router.get(
      this.path + '/config/products/:id',
      this.authVerify,
      this.getProduct
    );
    this.router.get(
      this.path + '/config/products/:id/images',
      this.authVerify,
      this.getImages
    );
    this.router.post(
      this.path + '/config/products',
      this.authVerify,
      this.createProduct
    );
    this.router.put(
      this.path + '/config/products/:id',
      this.authVerify,
      this.upload.single('image'),
      this.editProduct
    );
    this.router.put(
      this.path + '/config/products/:id/edit/thumbnail',
      this.authVerify,
      this.upload.single('image'),
      this.editImage
    );
    this.router.put(
      this.path + '/config/products/:id/edit/images/:number',
      this.authVerify,
      this.upload.single('image'),
      this.changeImage
    );
    this.router.post(
      this.path + '/config/products/:id/thumbnail',
      this.authVerify,
      this.upload.single('image'),
      this.updateImage
    );
    this.router.delete(
      this.path + '/config/products/:id',
      this.authVerify,
      this.deleteProduct
    );
  };

  private getProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    let query = {
      text: 'SELECT * FROM products WHERE id_product = $1',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Product not exist'] });
    query = {
      text: 'SELECT * FROM categories WHERE id_category = $1;',
      values: [product.rows[0].id_category],
    };
    const category = await this.db.query(query);
    query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1;',
      values: [product.rows[0].id_subcategory],
    };
    const subcategory = await this.db.query(query);
    if (!category.rows[0] || !subcategory.rows[0])
      return res
        .status(406)
        .json({ error: ['Error in category or subcategory data'] });
    return res.status(201).json({
      product: {
        id: product.rows[0].id_product,
        category: {
          id: category.rows[0].id_category,
          name: category.rows[0].title,
        },
        subcategory: {
          id: subcategory.rows[0].id_subcategory,
          name: subcategory.rows[0].title,
        },
        title: product.rows[0].title,
        thumbnail: product.rows[0].thumbnail,
        image_one: product.rows[0].image_one,
        image_two: product.rows[0].image_two,
        image_three: product.rows[0].image_three,
        image_four: product.rows[0].image_four,
        description: product.rows[0].description,
        colors: product.rows[0].colors,
        size: product.rows[0].size,
        price: product.rows[0].price,
        is_active: product.rows[0].is_active,
        stock: product.rows[0].stock,
      },
    });
  };

  private getProducts = async (req: Request, res: Response) => {
    const { limit = 10, offset = 0 } = req.query;
    let query = {
      text: 'SELECT * FROM products ORDER BY stock LIMIT $1 OFFSET $2;',
      values: [limit, offset],
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
        category: { id: category.id_category, name: category.title },
        subcategory: {
          id: subcategory.id_subcategory,
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
        is_active: product.is_active,
        stock: product.stock,
      };
    });
    return res.status(201).json({ products: response });
  };

  private getProductsFilter = async (req: Request, res: Response) => {
    const { name } = req.params;
    if (!name) return res.status(406).json({ error: ['Data invalid'] });
    let query = { text: 'SELECT * FROM categories;', values: [] };
    const categories = await this.db.query(query);
    query = { text: 'SELECT * FROM subcategories;', values: [] };
    const subcategories = await this.db.query(query);
    query = {
      text: `SELECT * FROM products WHERE title like '%${name.toUpperCase()}%';`,
      values: [],
    };
    const products = await this.db.query(query);
    const response = products.rows.map((product) => {
      const category = categories.rows.find(
        (ctg) => ctg.id_category === product.id_category
      );
      const subcategory = subcategories.rows.find(
        (subctg) => subctg.id_subcategory === product.id_subcategory
      );
      return {
        id: product.id_product,
        category: { id: category.id_category, name: category.title },
        subcategory: {
          id: subcategory.id_subcategory,
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
        is_active: product.is_active,
        stock: product.stock,
      };
    });
    return res.status(201).json({ products: response });
  };

  private getImages = async (req: Request, res: Response) => {
    const { id } = req.params;
    let query = {
      text: 'SELECT image_uno, image_dos, image_tres, image_cuatro FROM products WHERE id_product = $1;',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Product not exist'] });
    const { image_one, image_two, image_three, image_four } = product
      .rows[0] || { undefined };
    return res.status(201).json({
      images: {
        one: image_one,
        two: image_two,
        three: image_three,
        four: image_four,
      },
    });
  };

  private createProduct = async (req: Request, res: Response) => {
    let {
      id_category,
      id_subcategory,
      title,
      description,
      colors,
      size,
      price,
      is_active,
      stock,
    } = req.body.product || { undefined };
    if (
      !id_category &&
      !id_subcategory &&
      !title &&
      !size &&
      !price &&
      !price &&
      !stock
    )
      return res.status(406).json({ error: ['Data invalid'] });
    if (!colors) colors = undefined;
    let query = {
      text: 'SELECT * FROM categories WHERE id_category = $1;',
      values: [id_category],
    };
    const category = await this.db.query(query);
    query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1;',
      values: [id_subcategory],
    };
    const subcategory = await this.db.query(query);
    if (!category.rows[0] || !subcategory.rows[0])
      return res
        .status(406)
        .json({ error: ['Category or Subcategory invalid'] });
    query = {
      text: 'INSERT INTO products(id_category, id_subcategory, title, description, thumbnail, colors, size, price, is_active, stock) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);',
      values: [
        parseInt(id_category, 10),
        parseInt(id_subcategory, 10),
        title,
        description,
        'media/product.jpg',
        colors,
        size,
        parseInt(price, 10),
        Boolean(is_active),
        parseInt(stock, 10),
      ],
    };
    return this.db
      .query(query)
      .then(async () => {
        const query = {
          text: 'SELECT * FROM products WHERE title = $1;',
          values: [title],
        };
        const product = await this.db.query(query);
        return res.status(201).json({
          product: {
            id: product.rows[0].id_product,
            category: {
              id: category.rows[0].id_category,
              name: category.rows[0].title,
            },
            subcategory: {
              id: subcategory.rows[0].id_subcategory,
              name: subcategory.rows[0].title,
            },
            title,
            description,
            colors,
            size,
            price,
            is_active,
            stock,
          },
        });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };

  private updateImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (req.file) {
      let query = {
        text: 'UPDATE products SET thumbnail = $1 WHERE id_product = $2;',
        values: [req.file?.path.slice(3), parseInt(id, 10)],
      };
      await this.db
        .query(query)
        .then(() => {
          return res.status(201).send({ image: req.file?.path.slice(3) });
        })
        .catch((err) => {
          return res.status(406).json({ error: [err.code] });
        });
    } else {
      let query = {
        text: 'DELETE products WHERE id_product = $1;',
        values: [parseInt(id, 10)],
      };
      await this.db.query(query).then(() => {
        return res.status(406).json({ error: [''] });
      });
    }
  };

  private editProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    let {
      id_category,
      id_subcategory,
      title,
      description,
      colors,
      size,
      price,
      is_active,
      stock,
    } = req.body.product || { undefined };
    if (
      !id_category ||
      !id_subcategory ||
      !title ||
      !size ||
      !price ||
      is_active === undefined ||
      !stock
    )
      return res.status(406).json({ error: ['Data invalid'] });
    if (!colors) {
      colors = undefined;
    }
    let query = {
      text: 'UPDATE products SET id_category = $1, id_subcategory = $2, title = $3, description = $4, colors = $5, size = $6, price = $7, is_active = $8, stock = $9 WHERE id_product = $10;',
      values: [
        id_category,
        id_subcategory,
        title,
        description,
        colors,
        size,
        price,
        is_active,
        stock,
        id,
      ],
    };
    await this.db
      .query(query)
      .then(async () => {
        query = {
          text: 'SELECT * FROM products WHERE id_product = $1',
          values: [id],
        };
        const product = await this.db.query(query);
        if (!product.rows[0])
          return res.status(406).json({ error: ['Product not exist'] });
        query = {
          text: 'SELECT * FROM categories WHERE id_category = $1;',
          values: [product.rows[0].id_category],
        };
        const category = await this.db.query(query);
        query = {
          text: 'SELECT * FROM subcategories WHERE id_subcategory = $1;',
          values: [product.rows[0].id_subcategory],
        };
        const subcategory = await this.db.query(query);
        if (!category.rows[0] || !subcategory.rows[0])
          return res
            .status(406)
            .json({ error: ['Error in category or subcategory data'] });
        return res.status(201).json({
          product: {
            id: product.rows[0].id_product,
            category: {
              id: category.rows[0].id_category,
              name: category.rows[0].title,
            },
            subcategory: {
              id: subcategory.rows[0].id_subcategory,
              name: subcategory.rows[0].title,
            },
            title: product.rows[0].title,
            thumbnail: product.rows[0].thumbnail,
            image_one: product.rows[0].image_one,
            image_two: product.rows[0].image_two,
            image_three: product.rows[0].image_three,
            image_four: product.rows[0].image_four,
            description: product.rows[0].description,
            colors: product.rows[0].colors,
            size: product.rows[0].size,
            price: product.rows[0].price,
            is_active: product.rows[0].is_active,
            stock: product.rows[0].stock,
          },
        });
      })
      .catch((err) => {
        return res.status(406).json({ error: err.code });
      });
  };

  private editImage = async (req: Request, res: Response) => {
    const { id } = req.params;
    let query = {
      text: 'SELECT * FROM products WHERE id_product = $1',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Product not exist'] });
    if (req.file) {
      let query = {
        text: 'UPDATE products SET thumbnail = $1 WHERE id_product = $2;',
        values: [req.file?.path.slice(3), parseInt(id, 10)],
      };
      await this.db
        .query(query)
        .then(() => {
          return res.status(201).send({ image: req.file?.path.slice(3) });
        })
        .catch((err) => {
          return res.status(406).json({ error: [err.code] });
        });
    } else {
      return res.status(406).json({ error: ['Error save image'] });
    }
  };

  private changeImage = async (req: Request, res: Response) => {
    const { id, number } = req.params;
    let query = {
      text: 'SELECT * FROM products WHERE id_product = $1',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Product not exist'] });
    if (req.file) {
      if (parseInt(number, 10) === 1) {
        let query = {
          text: 'UPDATE products SET image_one = $1 WHERE id_product = $2;',
          values: [req.file?.path.slice(3), parseInt(id, 10)],
        };
        await this.db
          .query(query)
          .then(() => {
            return res.status(201).send({ image: req.file?.path.slice(3) });
          })
          .catch((err) => {
            return res.status(406).json({ error: [err.code] });
          });
      } else if (parseInt(number, 10) === 2) {
        let query = {
          text: 'UPDATE products SET image_two = $1 WHERE id_product = $2;',
          values: [req.file?.path.slice(3), parseInt(id, 10)],
        };
        await this.db
          .query(query)
          .then(() => {
            return res.status(201).send({ image: req.file?.path.slice(3) });
          })
          .catch((err) => {
            return res.status(406).json({ error: [err.code] });
          });
      } else if (parseInt(number, 10) === 3) {
        let query = {
          text: 'UPDATE products SET image_three = $1 WHERE id_product = $2;',
          values: [req.file?.path.slice(3), parseInt(id, 10)],
        };
        await this.db
          .query(query)
          .then(() => {
            return res.status(201).send({ image: req.file?.path.slice(3) });
          })
          .catch((err) => {
            return res.status(406).json({ error: [err.code] });
          });
      } else if (parseInt(number, 10) === 4) {
        let query = {
          text: 'UPDATE products SET image_four = $1 WHERE id_product = $2;',
          values: [req.file?.path.slice(3), parseInt(id, 10)],
        };
        await this.db
          .query(query)
          .then(() => {
            return res.status(201).send({ image: req.file?.path.slice(3) });
          })
          .catch((err) => {
            return res.status(406).json({ error: [err.code] });
          });
      } else return res.status(406).json({ error: ['Data invalid'] });
    } else {
      return res.status(406).json({ error: ['Error save image'] });
    }
  };

  private deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    let query = {
      text: 'SELECT * FROM products WHERE id_product = $1',
      values: [id],
    };
    const product = await this.db.query(query);
    if (!product.rows[0])
      return res.status(406).json({ error: ['Product not exist'] });
    query = {
      text: 'DELETE FROM products WHERE id_product = $1;',
      values: [id],
    };
    await this.db
      .query(query)
      .then(() => {
        return res.status(200).send();
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };
}
