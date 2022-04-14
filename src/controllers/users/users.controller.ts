import * as bcrypt from 'bcrypt';
import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import AuthMiddleware from '../../middlewares/auth.middleware';
import Controller from '../../models/interface/controllers.interface';

export default class UserController
  extends AuthMiddleware
  implements Controller
{
  path = '/api-rest/users';
  router = Router();
  private db = this.client;

  constructor() {
    super();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.post(this.path + '/register', this.register);
    this.router.post(this.path + '/login', this.login);
    this.router.get(this.path.slice(0, 5), this.tokenVerify, this.getUser);
    this.router.get(
      this.path.slice(0, 5) + '/profile',
      this.tokenVerify,
      this.profile
    );
  }

  private register = async (req: Request, res: Response) => {
    const { email, username, password } = req.body.user || { undefined };
    if (
      !email ||
      !username ||
      !password ||
      !this.userValidate(email, username, password)
    )
      return res.status(406).json({ error: ['Data invalid'] });
    const { bio, image } = {
      bio: 'Bio of Example',
      image:
        'https://w7.pngwing.com/pngs/505/824/png-transparent-logo-drawing-lion-lion-illustration-vertebrate-flower-fictional-character.png',
    };
    const query = {
      text: 'INSERT INTO users(email, username, password, bio, image) VALUES($1, $2, $3, $4, $5);',
      values: [email, username, await bcrypt.hash(password, 10), bio, image],
    };
    await this.db
      .query(query)
      .then(() => {
        const { token } = this.createToken({ email, password });
        return res
          .status(201)
          .json({ user: { email, username, token, bio, image } });
      })
      .catch((err) => {
        return res.status(406).json({ error: [err.code] });
      });
  };

  private login = async (req: Request, res: Response) => {
    const { email, password } = req.body.user || { undefined };
    if (!email || !password || !this.loginValidate(email, password))
      return res.status(406).json({ error: ['Data invalid'] });
    const query = {
      text: 'SELECT * FROM users WHERE email = $1',
      values: [email],
    };
    const user = await this.db.query(query);
    if (!user.rows[0])
      return res.status(406).json({ error: ['Email or password incorrect'] });
    bcrypt.compare(password, user.rows[0].password, (err, result) => {
      if (err || !result) {
        return res.status(406).json({ error: ['Email or password incorrect'] });
      } else {
        const { token } = this.createToken({ email, password });
        const { image, bio, username } = user.rows[0];
        return res
          .status(201)
          .json({ user: { email, username, token, bio, image } });
      }
    });
  };

  private getUser = async (req: Request, res: Response) => {
    const accessToken = req.headers['authorization'];
    let { user, error } = await this.verifyToken(accessToken);
    if (error) return res.status(401).send();
    const query = {
      text: 'SELECT * FROM users WHERE email = $1',
      values: [user.rows[0].email],
    };
    user = await this.db.query(query);
    const { token } = this.createToken({
      email: user.rows[0].email,
      password: JSON.parse(
        JSON.stringify(jwt.decode(accessToken!.slice(7), { complete: false }))
      ).password,
    });
    const { email, username, image, bio } = user.rows[0];
    return res
      .status(201)
      .json({ user: { email, username, token, bio, image } });
  };

  private profile = async (req: Request, res: Response) => {};

  private userValidate = (
    email: string,
    username: string,
    password: string
  ): boolean => {
    return (
      this.validateEmail(email) &&
      username.length > 4 &&
      username.length < 16 &&
      password.length >= 8 &&
      password.length <= 16
    );
  };
}
