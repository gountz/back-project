import 'dotenv';
import { createTransport } from 'nodemailer';

const transporter = createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  tls: {
    rejectUnauthorized: false,
  },
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL, // generated ethereal user
    pass: process.env.PASS, // generated ethereal password
  },
});

export const send = async (email: string, subject: string, html: any) => {
  return await transporter.sendMail({
    from: `"Tu Sport" <${process.env.EMAIL}>`, // sender address
    to: email, // list of receivers
    subject, // Subject line
    text: 'Token de confirmación', // plain text body
  });
};
