import { Request, Response, Router } from 'express';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class SubCategoryAdminController
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
      this.path + '/subcategories',
      this.authVerify,
      this.getSubCategories
    );
    this.router.get(
      this.path + '/config/subcategories/:id',
      this.authVerify,
      this.getSubCategory
    );
    this.router.post(
      this.path + '/config/subcategories',
      this.authVerify,
      this.createSubCategory
    );
    this.router.put(
      this.path + '/config/subcategories/:id',
      this.authVerify,
      this.editSubCategory
    );
    this.router.delete(
      this.path + '/config/subcategories/:id',
      this.authVerify,
      this.deleteSubCategory
    );
  };

  private getSubCategories = async (req: Request, res: Response) => {
    const query = {
      text: 'SELECT id_subcategory, title FROM subcategories ORDER BY title;',
    };
    const categories = await this.db.query(query);
    const response = categories.rows.map(
      (subcategory: { id_subcategory: number; title: string }) => {
        return { id: subcategory.id_subcategory, name: subcategory.title };
      }
    );
    return res.status(201).json({ subcategories: response });
  };

  private getSubCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
      values: [id],
    };
    const subcategory = await this.db.query(query);
    if (!subcategory.rows[0])
      return res.status(201).json({ category: { id: null, name: null } });
    const { id_subcategory, title } = subcategory.rows[0];
    return res
      .status(201)
      .json({ subcategory: { id: id_subcategory, name: title } });
  };

  private createSubCategory = async (req: Request, res: Response) => {
    const { name } = req.body.subcategory || { undefined };
    if (!name) return res.status(406).json({ error: ['Data invalid'] });
    let query = {
      text: 'SELECT * FROM subcategories WHERE title = $1;',
      values: [name],
    };
    const subcategory = await this.db.query(query);
    if (subcategory.rows[0])
      return res.status(406).json({ error: ['Sub category alredy exist'] });
    query = {
      text: 'INSERT INTO subcategories(title) VALUES($1);',
      values: [name.toUpperCase()],
    };
    await this.db
      .query(query)
      .then(async () => {
        const query = {
          text: 'SELECT * FROM subcategories WHERE title = $1;',
          values: [name.toUpperCase()],
        };
        const subcategory = await this.db.query(query);
        const { id } = subcategory.rows[0];
        return res
          .status(201)
          .json({ subcategory: { id, name: name.toUpperCase() } });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err] });
      });
  };

  private editSubCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body.subcategory || { undefined };
    if (!name) return res.status(406).json({ error: ['Data Invalid'] });
    const query = {
      text: 'UPDATE subcategories SET title = $1 WHERE id_subcategory = $2',
      values: [name.toUpperCase(), id],
    };
    await this.db
      .query(query)
      .then(async () => {
        return res
          .status(201)
          .json({ subcategory: { id, title: name.toUpperCase() } });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };

  private deleteSubCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const query = {
      text: 'SELECT * FROM subcategories WHERE id_subcategory = $1',
      values: [id],
    };
    const subcategories = await this.db.query(query);
    if (!subcategories.rows[0]) return res.status(406).json({ error: [] });
    const deleteQuery = {
      text: 'DELETE FROM subcategories WHERE id_subcategory = $1',
      values: [subcategories.rows[0].id_subcategory],
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
}
