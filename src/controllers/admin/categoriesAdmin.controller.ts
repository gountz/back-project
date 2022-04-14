import { Request, Response, Router } from 'express';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class CategoryAdminController
  extends AuthMiddleware
  implements Controller
{
  path = '/admin/api-rest';
  router = Router();
  private db = this.client;

  constructor() {
    super();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      this.path + '/categories',
      this.authVerify,
      this.getCategories
    );
    this.router.get(
      this.path + '/config/categories/:id',
      this.authVerify,
      this.getCategory
    );
    this.router.get(
      this.path + '/config/categorysubcategories/:id',
      this.authVerify,
      this.getCategorySubCategories
    );
    this.router.post(
      this.path + '/config/categories',
      this.authVerify,
      this.createCategory
    );
    this.router.post(
      this.path + '/config/categorysubcategories/:id',
      this.authVerify,
      this.createCategorySubCategories
    );
    this.router.put(
      this.path + '/config/categories/:id',
      this.authVerify,
      this.editCategory
    );
    this.router.delete(
      this.path + '/config/categories/:id',
      this.authVerify,
      this.deleteCategory
    );
    this.router.delete(
      this.path + '/config/categorysubcategories/:id/:id_subcategory',
      this.authVerify,
      this.deleteCategorySubCategories
    );
  };

  private getCategories = async (req: Request, res: Response) => {
    const query = {
      text: 'SELECT id_category, title FROM categories ORDER BY title;',
    };
    const categories = await this.db.query(query);
    const response = categories.rows.map(
      (category: { id_category: number; title: string }) => {
        return { id: category.id_category, name: category.title };
      }
    );
    return res.status(201).json({ categories: response });
  };

  private getCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = {
      text: 'SELECT * FROM categories WHERE id_category = $1',
      values: [parseInt(id, 10)],
    };
    const category = await this.db.query(query);
    if (!category.rows[0])
      return res.status(406).json({ error: ['Category not exist'] });
    const { id_category, title } = category.rows[0];
    return res.status(201).json({ category: { id: id_category, name: title } });
  };

  private getCategorySubCategories = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = {
      text: 'SELECT * FROM categories_subcategories WHERE id_category = $1',
      values: [id],
    };
    const categorySubCategories = await this.db.query(query);
    const subCategories = [];
    for (let subcategory of categorySubCategories.rows) {
      const query = {
        text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
        values: [subcategory.id_subcategory],
      };
      const subCategory = await this.db.query(query);
      const { id_subcategory, title } = subCategory.rows[0];
      subCategories.push({ id: id_subcategory, name: title });
    }
    res.status(201).json({ subcategories: subCategories });
  };

  private createCategory = async (req: Request, res: Response) => {
    const { name } = req.body.category || { undefined };
    if (!name) return res.status(406).json({ error: ['Data invalid'] });
    let query = {
      text: 'SELECT * FROM categories WHERE title = $1;',
      values: [name.toUpperCase()],
    };
    const category = await this.db.query(query);
    if (category.rows[0])
      return res.status(406).json({ error: ['Category already exist'] });
    query = {
      text: 'INSERT INTO categories(title) VALUES($1);',
      values: [name.toUpperCase()],
    };
    await this.db
      .query(query)
      .then(async () => {
        const query = {
          text: 'SELECT * FROM categories WHERE title = $1;',
          values: [name.toUpperCase()],
        };
        const category = await this.db.query(query);
        const { id } = category.rows[0];
        return res
          .status(201)
          .json({ category: { id, name: name.toUpperCase() } });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err] });
      });
  };

  private createCategorySubCategories = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id_subcategory } = req.body.subcategory || { undefined };
    if (!id_subcategory)
      return res.status(406).json({ error: ['Data Invalid'] });
    let query = {
      text: 'SELECT * FROM categories WHERE id_category = $1',
      values: [parseInt(id, 10)],
    };
    const category = await this.db.query(query);
    query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
      values: [parseInt(id_subcategory, 10)],
    };
    const subcategory = await this.db.query(query);
    if (!category.rows[0] || !subcategory.rows[0])
      return res.status(406).json({ error: [] });
    query = {
      text: 'SELECT * FROM categories_subcategories WHERE id_category = $1 AND id_subcategory = $2',
      values: [parseInt(id, 10), parseInt(id_subcategory, 10)],
    };
    const categorySubcategory = await this.db.query(query);
    if (categorySubcategory.rows[0]) return res.status(406).json({ error: [] });
    query = {
      text: 'INSERT INTO categories_subcategories(id_category, id_subcategory) VALUES($1, $2)',
      values: [parseInt(id, 10), parseInt(id_subcategory, 10)],
    };
    await this.db
      .query(query)
      .then(() => {
        return res.status(201).json({
          subcategory: {
            id: id_subcategory,
            name: subcategory.rows[0].title,
          },
        });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };

  private editCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body.category || { undefined };
    if (!name) return res.status(406).json({ error: ['Data Invalid'] });
    let query = {
      text: 'SELECT * FROM categories WHERE title = $1;',
      values: [name.toUpperCase()],
    };
    const category = await this.db.query(query);
    if (category.rows[0])
      return res.status(406).json({ error: ['Category already exist'] });
    query = {
      text: 'UPDATE categories set title = $1 WHERE id_category = $2',
      values: [name.toUpperCase(), id],
    };
    await this.db
      .query(query)
      .then(async () => {
        return res.status(201).json({ category: { id, title: name } });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };

  private deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = {
      text: 'SELECT * FROM categories WHERE id_category = $1',
      values: [id],
    };
    const categories = await this.db.query(query);
    if (!categories.rows[0]) return res.status(406).json({ error: [] });
    const deleteQuery = {
      text: 'DELETE FROM categories WHERE id_category = $1',
      values: [id],
    };
    await this.db
      .query(deleteQuery)
      .then(() => {
        return res.status(200).send();
      })
      .catch((err) => {
        return res.status(406).json({ error: err.code });
      });
  };

  private deleteCategorySubCategories = async (req: Request, res: Response) => {
    const { id, id_subcategory } = req.params;
    let query = {
      text: 'SELECT * FROM categories WHERE id_category = $1',
      values: [id],
    };
    const category = await this.db.query(query);
    query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
      values: [id_subcategory],
    };
    const subcategory = await this.db.query(query);
    if (!category.rows[0] || !subcategory.rows[0])
      return res.status(406).json({ error: [] });
    query = {
      text: 'SELECT * FROM categories_subcategories WHERE id_category = $1 AND id_subcategory = $2',
      values: [id, id_subcategory],
    };
    const categorySubcategory = await this.db.query(query);
    if (!categorySubcategory.rows[0])
      return res.status(406).json({ error: [] });
    query = {
      text: 'DELETE FROM categories_subcategories WHERE id_category = $1 AND id_subcategory = $2',
      values: [id, id_subcategory],
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
