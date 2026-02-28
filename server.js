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
const basicAuth = require('express-basic-auth');

// inject env vars
dotenv.config({path: './config/config.env'});

//connect to database
connectDB();

//routes in the future
const auth = require('./routes/auth');
const restaurants = require('./routes/restaurants');
const reservations = require('./routes/reservations');

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

// //set security headers
app.use(helmet());

// //prevent XSS attacks
app.use(xss());

const limiter = rateLimit({
    windowMs: 5 * 1000, //maximum 20 requests per 5 second
    max: 20,
});
app.use(limiter);

// //prevent http param pollution
app.use(hpp());

// //enable CORS
app.use(cors());

//mount routers in the future
app.use('/api/v1/auth', auth);
app.use('/api/v1/restaurants', restaurants);
app.use('/api/v1/reservations', reservations);

const PORT = process.env.PORT || 5000;

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Restaurant Reservation API',
            version: '1.0.0',
            description: 'A simple Express Restaurant Reservation API'
        },
        servers: [
            {
                url: "http://localhost:5000/api/v1",
                description: "Local",
            }
        ],
        
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: ['./controllers/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', basicAuth({
        users: { [process.env.SWAGGER_USER]: process.env.SWAGGER_PASSWORD},
        challenge: true
    }),
    swaggerUI.serve,
    swaggerUI.setup(swaggerDocs)
);

const server = app.listen(PORT, console.log('Server running in', process.env.NODE_ENV, 'mode on port', PORT));

//handle unhandled promise rejections
process.on('unhandledRejection', (err, Promise) => {
    console.log(`Error: ${err.message}`);
    //close server & exit process
    server.close(() => process.exit(1));
});
