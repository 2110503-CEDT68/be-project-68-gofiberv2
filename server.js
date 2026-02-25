const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const mongoSanitize=require('@exortek/express-mongo-sanitize');
const helmet=require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit =require('express-rate-limit');
const hpp=require('hpp');
const cors=require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

// inject env vars
dotenv.config({path: './config/config.env'});

//connect to database
connectDB();

//routes in the future
const auth = require('./routes/auth');

//initialize app
const app = express();

//query Parser
app.set('query parser', 'extended');

//body parser
app.use(express.json());

//cookie parser
app.use(cookieParser());

//sanitize data
app.use(mongoSanitize());

//set security headers
app.use(helmet());

//prevent XSS attacks
app.use(xss());

//prevent http param pollution
app.use(hpp());

//enable CORS
app.use(cors());

//mount routers in the future
app.use('/api/v1/auth', auth);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, console.log('Server running in', process.env.NODE_ENV, 'mode on port', PORT));

//handle unhandled promise rejections
process.on('unhandledRejection', (err, Promise) => {
    console.log(`Error: ${err.message}`);
    //close server & exit process
    server.close(() => process.exit(1));
});
