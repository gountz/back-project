import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import DataBase from '../database/database';
import { UserLogin } from '../models/interface/user.interface';

export default class AuthMiddleware extends DataBase {
  client = this.connectedDataBase();

  constructor() {
    super();
  }

  createToken = (user: UserLogin) => {
    const expiresIn = 60 * 60 * 24; // an day
    const { JWT_SECRET } = process.env;
    const dataStoredInToken: UserLogin = {
      email: user.email,
      password: user.password,
    };
    return {
      token: jwt.sign(dataStoredInToken, JWT_SECRET!, { expiresIn }),
    };
  };

  verifyToken = async (token?: string): Promise<any> => {
    if (!token || token.slice(0, 7) !== 'Bearer ') {
      return { error: 'Se requiere' };
    } else {
      const { JWT_SECRET } = process.env;
      const response = jwt.verify(token.slice(7), JWT_SECRET!, (err, user) => {
        return err ? { error: err.message } : { user };
      });
      return response;
    }
  };

  createTokenAdmin = (user: UserLogin) => {
    const expiresIn = 60 * 60; // an hour
    const { JWT_ADMIN_SECRET } = process.env;
    const dataStoredInToken: UserLogin = {
      email: user.email,
      password: user.password,
    };
    return {
      token: jwt.sign(dataStoredInToken, JWT_ADMIN_SECRET!, { expiresIn }),
    };
  };

  checkToken = async (token?: string): Promise<any> => {
    if (!token || token.slice(0, 7) !== 'Bearer ') {
      return { error: 'Se requiere' };
    } else {
      const { JWT_ADMIN_SECRET } = process.env;
      const response = jwt.verify(
        token.slice(7),
        JWT_ADMIN_SECRET!,
        (err, user) => {
          return err ? { error: err.message } : { user };
        }
      );
      return response;
    }
  };

  authVerify = async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.headers['authorization'];
    const { user, error } = await this.checkToken(accessToken);
    if (error) return res.status(401).send();
    const query = {
      text: 'SELECT * FROM admins WHERE email = $1',
      values: [user.email],
    };
    const admin = await this.client.query(query);
    if (!admin.rows[0] || !admin.rows[0].is_active || !admin.rows[0].is_staff)
      return res.status(401).send();
    next();
  };

  tokenVerify = async (req: Request, res: Response, next: NextFunction) => {
    const accessToken = req.headers['authorization'];
    let { user, error } = await this.verifyToken(accessToken);
    if (error) return res.status(401).send();
    const query = {
      text: 'SELECT * FROM users WHERE email = $1',
      values: [user.email],
    };
    user = await this.client.query(query);
    if (!user.rows[0]) return res.status(401).send();
    next();
  };

  validateEmail = (email: string): boolean => {
    const reg = /\S+@\S+\.\S+/;
    return reg.test(email);
  };

  loginValidate = (email: string, password: string): boolean => {
    return (
      this.validateEmail(email) && password.length >= 8 && password.length <= 16
    );
  };
}
