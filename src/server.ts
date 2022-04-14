import 'dotenv/config';
import App from './app';
import AdminController from './controllers/admin/admin.controller';
import CategoryAdminController from './controllers/admin/categoriesAdmin.controller';
import ProductAdminController from './controllers/admin/productsAdmin.controller';
import SubCategoryAdminController from './controllers/admin/subcategoriesAdmin.controller';
import CartController from './controllers/users/cart.controller';
import ProductController from './controllers/users/products.controller';
import UserController from './controllers/users/users.controller';

const app = new App([
  new UserController(),
  new AdminController(),
  new CategoryAdminController(),
  new SubCategoryAdminController(),
  new ProductAdminController(),
  new ProductController(),
  new CartController(),
]);

app.listen();
