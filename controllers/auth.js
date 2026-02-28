const User = require("../models/User");

/**
* @swagger
* components:
*   schemas:
*     User:
*       type: object
*       required:
*         - name
*         - tel
*         - email
*         - password
*         - role
*       properties:
*         name:
*           type: string
*           description: User name
*         tel:
*           type: string
*           description: User telephone number
*         email:
*           type: string
*           description: User email
*         password:
*           type: string
*           description: User password
*         role:
*           type: string
*           enum: [user, admin]
*           default: user
*           description: User role
*/

/**
* @swagger
* tags:
*   name: Auth
*   description: The authentication managing API
*/

/**
* @swagger
* /auth/register:
*   post:
*     summary: Register a new user
*     tags: [Auth]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/User'
*     responses:
*       201:
*         description: The user was successfully created
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/User'
*       400:
*         description: Bad request
*/



// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    try {
        const { name, tel, email, password, role } = req.body;

        //Create a user
        const user = await User.create({
            name,
            tel,
            email,
            password,
            role,
        });

        // Create token
        sendTokenResponse(user, 201, res);

    } catch (err) {
        res.status(400).json({ success: false });
        console.log(err.stack);
    }
};

/**
* @swagger
* /auth/login:
*   post:
*     summary: Login user
*     tags: [Auth]
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             required:
*               - email
*               - password
*             properties:
*               email:
*                 type: string
*               password:
*                 type: string
*     responses:
*       200:
*         description: User logged in successfully
*       400:
*         description: Please provide an email and password
*       401:
*         description: Invalid credentials
*       404:
*         description: User not found
*/


// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    try {

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({ success: false, msg: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(404).json({ success: false, msg: 'User not found' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return res.status(401).json({ success: false, msg: 'Invalid credentials' });
    }

    // Create token
    sendTokenResponse(user, 200, res);

    } catch (err) {
        res.status(401).json({ success: false, msg: 'Cannot convert email or password' });
    }
}

const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token
    });
};


/**
* @swagger
* /auth/me:
*   get:
*     summary: Get current logged in user
*     tags: [Auth]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: The current user
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/User'
*/



//@desc     Get current Logged in user
//@route    POST /api/v1/auth/me
//@access   Private
exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
};

/**
* @swagger
* /auth/logout:
*   get:
*     summary: Log user out
*     tags: [Auth]
*     responses:
*       200:
*         description: User logged out successfully
*/


// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req,res,next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ success: true, data: {} });
};
