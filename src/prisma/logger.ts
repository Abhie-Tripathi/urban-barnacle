// import { createLogger, format, transports } from 'winston';
// import * as fs from 'fs';

// const logDir = './logs';
// if (!fs.existsSync(logDir)) {
//   // fs.mkdirSync(logDir);
// }
// const logger = createLogger({
//   level: 'info',
//   format: format.combine(
//     format.timestamp({
//       format: 'YYYY-MM-DD HH:mm:ss',
//     }),
//     format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
//   ),
//   transports: [
//     new transports.File({
//       filename: './logs/query.log',
//       level: 'info',
//       // format: format.combine(format.printf(({ message }) => `${message}\n`)),
//     }),
//     // new transports.Console({ level: 'info' }),
//   ],
// });

// export default logger;
