import * as bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class AdminController
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
    this.router.post(this.path + '/users/login', this.login);
    this.router.post(
      this.path + '/users/register',
      this.authVerify,
      this.register
    );
  };

  private login = async (req: Request, res: Response) => {
    const { email, password } = req.body.user || { undefined };
    if (!email || !password || !this.loginValidate(email, password))
      return res.status(406).json({ error: ['Data invalid'] });
    const query = {
      text: 'SELECT * FROM admins WHERE email = $1',
      values: [email],
    };
    const admin = await this.db.query(query);
    if (!admin.rows[0] || !admin.rows[0].is_active || !admin.rows[0].is_staff)
      return res.status(406).json({ error: ['Email or password incorrect'] });
    bcrypt.compare(password, admin.rows[0].password, (err, result) => {
      if (!result || err) {
        return res.status(406).json({ error: ['Email or password incorrect'] });
      } else {
        const { token } = this.createTokenAdmin({ email, password });
        const { username } = admin.rows[0];
        return res.status(201).json({ user: { email, username, token } });
      }
    });
  };

  private register = async (req: Request, res: Response) => {
    const { email, username, password } = req.body.user;
    const hash = await bcrypt.hash(password, 10);
    const query = {
      text: 'INSERT INTO admins(email, username, password, is_active, is_staff) VALUES($1, $2, $3, $4, $5);',
      values: [email, username, hash, true, true],
    };
    await this.db
      .query(query)
      .then(() => {
        res.status(201).send();
      })
      .catch((err) => {
        res.status(406).send();
      });
  };
}
